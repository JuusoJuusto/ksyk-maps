import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Link, Unlink, Search, X, UserPlus } from "lucide-react";

interface ParentChildLinkManagerProps {
  userId: string;
  userRole: 'parent' | 'student';
  userName: string;
}

export default function ParentChildLinkManager({ userId, userRole, userName }: ParentChildLinkManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  // Fetch linked children (for parents)
  const { data: children = [], isLoading: childrenLoading } = useQuery({
    queryKey: ['parent-children', userId],
    queryFn: async () => {
      if (userRole !== 'parent') return [];
      const response = await fetch(`/api/wilma/parent/${userId}/children`);
      if (!response.ok) throw new Error('Failed to fetch children');
      return response.json();
    },
    enabled: userRole === 'parent',
  });

  // Fetch linked parents (for students)
  const { data: parents = [], isLoading: parentsLoading } = useQuery({
    queryKey: ['child-parents', userId],
    queryFn: async () => {
      if (userRole !== 'student') return [];
      const response = await fetch(`/api/wilma/child/${userId}/parents`);
      if (!response.ok) throw new Error('Failed to fetch parents');
      return response.json();
    },
    enabled: userRole === 'student',
  });

  // Fetch all students for linking
  const { data: allStudents = [] } = useQuery({
    queryKey: ['all-students'],
    queryFn: async () => {
      const response = await fetch('/api/wilma/users?role=student');
      if (!response.ok) throw new Error('Failed to fetch students');
      return response.json();
    },
    enabled: showLinkDialog && userRole === 'parent',
  });

  // Link mutation
  const linkMutation = useMutation({
    mutationFn: async ({ parentId, childId }: { parentId: string; childId: string }) => {
      const response = await fetch('/api/wilma/link-parent-child', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId, childId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to link');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-children'] });
      queryClient.invalidateQueries({ queryKey: ['child-parents'] });
      queryClient.invalidateQueries({ queryKey: ['wilma-users'] });
      toast({
        title: "✅ Linkitetty",
        description: "Oppilas linkitetty vanhempaan onnistuneesti",
      });
      setShowLinkDialog(false);
      setSelectedStudent(null);
      setSearchQuery("");
    },
    onError: (error: any) => {
      toast({
        title: "❌ Virhe",
        description: error.message || "Linkitys epäonnistui",
        variant: "destructive",
      });
    },
  });

  // Unlink mutation
  const unlinkMutation = useMutation({
    mutationFn: async ({ parentId, childId }: { parentId: string; childId: string }) => {
      const response = await fetch('/api/wilma/link-parent-child', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId, childId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to unlink');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-children'] });
      queryClient.invalidateQueries({ queryKey: ['child-parents'] });
      queryClient.invalidateQueries({ queryKey: ['wilma-users'] });
      toast({
        title: "✅ Poistettu",
        description: "Linkitys poistettu onnistuneesti",
      });
    },
    onError: (error: any) {
      toast({
        title: "❌ Virhe",
        description: error.message || "Linkityksen poisto epäonnistui",
        variant: "destructive",
      });
    },
  });

  // Filter students based on search
  const filteredStudents = allStudents.filter((student: any) => {
    const searchLower = searchQuery.toLowerCase();
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const studentId = student.studentId?.toLowerCase() || '';
    return fullName.includes(searchLower) || studentId.includes(searchLower);
  });

  // Handle link
  const handleLink = (childId: string) => {
    if (userRole === 'parent') {
      linkMutation.mutate({ parentId: userId, childId });
    }
  };

  // Handle unlink
  const handleUnlink = (childId: string) => {
    if (confirm('Haluatko varmasti poistaa linkityksen?')) {
      if (userRole === 'parent') {
        unlinkMutation.mutate({ parentId: userId, childId });
      }
    }
  };

  if (userRole === 'parent') {
    return (
      <Card className="border-blue-200">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Linkitetyt oppilaat
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setShowLinkDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Linkitä oppilas
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {childrenLoading ? (
            <div className="text-center py-4 text-gray-500">Ladataan...</div>
          ) : children.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>Ei linkitettyjä oppilaita</p>
              <p className="text-sm mt-1">Klikkaa "Linkitä oppilas" lisätäksesi</p>
            </div>
          ) : (
            <div className="space-y-2">
              {children.map((child: any) => (
                <div
                  key={child.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {child.firstName} {child.lastName}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Oppilastunnus: {child.studentId} • Luokka: {child.studentClass || 'Ei määritetty'}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleUnlink(child.id)}
                    disabled={unlinkMutation.isPending}
                  >
                    <Unlink className="h-4 w-4 mr-1" />
                    Poista
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        {/* Link Dialog */}
        <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Linkitä oppilas vanhempaan: {userName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Hae oppilasta nimellä tai oppilastunnuksella..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Students List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchQuery ? 'Ei hakutuloksia' : 'Ei oppilaita'}
                  </div>
                ) : (
                  filteredStudents.map((student: any) => {
                    const isLinked = children.some((c: any) => c.id === student.id);
                    return (
                      <div
                        key={student.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          isLinked
                            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                            : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {student.firstName} {student.lastName}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Oppilastunnus: {student.studentId} • Luokka: {student.studentClass || 'Ei määritetty'}
                          </div>
                        </div>
                        {isLinked ? (
                          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <Link className="h-4 w-4" />
                            <span className="text-sm font-semibold">Linkitetty</span>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleLink(student.id)}
                            disabled={linkMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Link className="h-4 w-4 mr-1" />
                            Linkitä
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
                <X className="h-4 w-4 mr-1" />
                Sulje
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    );
  }

  // Student view - show linked parents
  if (userRole === 'student') {
    return (
      <Card className="border-purple-200">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            Linkitetyt vanhemmat
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {parentsLoading ? (
            <div className="text-center py-4 text-gray-500">Ladataan...</div>
          ) : parents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>Ei linkitettyjä vanhempia</p>
            </div>
          ) : (
            <div className="space-y-2">
              {parents.map((parent: any, index: number) => (
                <div
                  key={parent.id}
                  className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="font-semibold text-gray-900 dark:text-white">
                    Vanhempi {index + 1}: {parent.firstName} {parent.lastName}
                  </div>
                  {parent.email && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      📧 {parent.email}
                    </div>
                  )}
                  {parent.phone && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      📱 {parent.phone}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}
