import { useState, useMemo } from 'react';
import { Search, User, GraduationCap, Users, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EnhancedUserSelectorProps {
  users: any[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  filterRole?: 'student' | 'teacher' | 'parent' | 'all';
  showDetails?: boolean;
  className?: string;
}

export default function EnhancedUserSelector({
  users,
  value,
  onChange,
  label,
  placeholder = "Valitse käyttäjä...",
  required = false,
  disabled = false,
  filterRole = 'all',
  showDetails = true,
  className = ""
}: EnhancedUserSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Filter users by role if specified
  const filteredByRole = useMemo(() => {
    if (!users || users.length === 0) return [];
    if (filterRole === 'all') return users;
    return users.filter(user => user?.role === filterRole);
  }, [users, filterRole]);

  // Filter by search term
  const filteredUsers = useMemo(() => {
    if (!filteredByRole || filteredByRole.length === 0) return [];
    if (!searchTerm) return filteredByRole;
    
    const search = searchTerm.toLowerCase();
    return filteredByRole.filter(user => {
      if (!user) return false;
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
      const studentId = user.studentId?.toString().toLowerCase() || '';
      const email = user.email?.toLowerCase() || '';
      const studentClass = user.studentClass?.toLowerCase() || '';
      
      return fullName.includes(search) || 
             studentId.includes(search) || 
             email.includes(search) ||
             studentClass.includes(search);
    });
  }, [filteredByRole, searchTerm]);

  // Get selected user
  const selectedUser = users?.find(u => 
    u && (u.id === value || 
    u.studentId === value || 
    u.email === value)
  );

  // Get icon based on role
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'student':
        return <User className="w-4 h-4 text-blue-600" />;
      case 'teacher':
        return <GraduationCap className="w-4 h-4 text-green-600" />;
      case 'parent':
        return <Users className="w-4 h-4 text-purple-600" />;
      default:
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  // Get role label in Finnish
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'student':
        return 'Opiskelija';
      case 'teacher':
        return 'Opettaja';
      case 'parent':
        return 'Huoltaja';
      case 'admin':
        return 'Ylläpitäjä';
      default:
        return role;
    }
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <Label className="mb-1 block">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      
      {/* Selected User Display / Dropdown Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-md text-left flex items-center justify-between ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-gray-400 cursor-pointer'
        } ${isOpen ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'}`}
      >
        {selectedUser ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {getRoleIcon(selectedUser.role)}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">
                {selectedUser.firstName} {selectedUser.lastName}
              </p>
              {showDetails && (
                <p className="text-xs text-gray-600 truncate">
                  {selectedUser.studentId && `ID: ${selectedUser.studentId}`}
                  {selectedUser.studentClass && ` • ${selectedUser.studentClass}`}
                  {selectedUser.role && ` • ${getRoleLabel(selectedUser.role)}`}
                </p>
              )}
            </div>
          </div>
        ) : (
          <span className="text-gray-500">{placeholder}</span>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-96 overflow-hidden">
            {/* Search Box */}
            <div className="p-3 border-b bg-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Hae nimellä, ID:llä tai luokalla..."
                  className="pl-10 text-sm"
                  autoFocus
                />
              </div>
            </div>

            {/* User List */}
            <div className="overflow-y-auto max-h-80">
              {filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  Ei tuloksia
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      onChange(user.studentId || user.id);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 ${
                      (value === user.id || value === user.studentId) ? 'bg-blue-100' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        user.role === 'student' ? 'bg-blue-100' :
                        user.role === 'teacher' ? 'bg-green-100' :
                        user.role === 'parent' ? 'bg-purple-100' :
                        'bg-gray-100'
                      }`}>
                        {getRoleIcon(user.role)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        {showDetails && (
                          <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5">
                            {user.studentId && (
                              <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                                ID: {user.studentId}
                              </span>
                            )}
                            {user.studentClass && (
                              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                {user.studentClass}
                              </span>
                            )}
                            {user.role && (
                              <span className={`px-2 py-0.5 rounded ${
                                user.role === 'student' ? 'bg-blue-100 text-blue-700' :
                                user.role === 'teacher' ? 'bg-green-100 text-green-700' :
                                user.role === 'parent' ? 'bg-purple-100 text-purple-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {getRoleLabel(user.role)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
