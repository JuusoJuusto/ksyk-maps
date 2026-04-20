import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, User, MapPin, Phone, Heart, AlertCircle, Home, Users } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Generate a secure random password
function generateRandomPassword(): string {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

export default function StudentForm() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/wilma-admin/:adminId/student/:studentId');
  const [matchAdd, paramsAdd] = useRoute('/wilma-admin/:adminId/add-student');
  const queryClient = useQueryClient();
  
  const adminId = params?.adminId || paramsAdd?.adminId;
  const studentId = params?.studentId;
  const isEdit = studentId && studentId !== 'new';

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    studentClass: "",
    dateOfBirth: "",
    phone: "",
    
    // Primary Address
    address1: "",
    city1: "",
    postalCode1: "",
    
    // Secondary Address (for divorced parents)
    hasSecondAddress: false,
    address2: "",
    city2: "",
    postalCode2: "",
    
    // Emergency Contact
    emergencyContact: "",
    emergencyPhone: "",
    emergencyRelationship: "",
    
    // Medical Information
    medicalInfo: "",
    allergies: "",
    medications: "",
    
    // Parent 1 Information
    parent1FirstName: "",
    parent1LastName: "",
    parent1Email: "",
    parent1Phone: "",
    parent1Relationship: "Mother",
    
    // Parent 2 Information (optional)
    hasParent2: false,
    parent2FirstName: "",
    parent2LastName: "",
    parent2Email: "",
    parent2Phone: "",
    parent2Relationship: "Father",
    
    // Additional Info
    notes: ""
  });

  // Fetch student data if editing
  const { data: student } = useQuery({
    queryKey: ["student", studentId],
    queryFn: async () => {
      const response = await fetch(`/api/wilma/users/${studentId}`);
      if (!response.ok) throw new Error("Failed to fetch student");
      return response.json();
    },
    enabled: isEdit
  });

  useEffect(() => {
    if (student) {
      setFormData({
        firstName: student.firstName || "",
        lastName: student.lastName || "",
        email: student.email || "",
        studentClass: student.studentClass || "",
        dateOfBirth: student.dateOfBirth || "",
        phone: student.phone || "",
        address1: student.address1 || student.address || "",
        city1: student.city1 || student.city || "",
        postalCode1: student.postalCode1 || student.postalCode || "",
        hasSecondAddress: !!student.address2,
        address2: student.address2 || "",
        city2: student.city2 || "",
        postalCode2: student.postalCode2 || "",
        emergencyContact: student.emergencyContact || "",
        emergencyPhone: student.emergencyPhone || "",
        emergencyRelationship: student.emergencyRelationship || "",
        medicalInfo: student.medicalInfo || "",
        allergies: student.allergies || "",
        medications: student.medications || "",
        parent1FirstName: student.parent1FirstName || "",
        parent1LastName: student.parent1LastName || "",
        parent1Email: student.parent1Email || "",
        parent1Phone: student.parent1Phone || "",
        parent1Relationship: student.parent1Relationship || "Mother",
        hasParent2: !!student.parent2Email,
        parent2FirstName: student.parent2FirstName || "",
        parent2LastName: student.parent2LastName || "",
        parent2Email: student.parent2Email || "",
        parent2Phone: student.parent2Phone || "",
        parent2Relationship: student.parent2Relationship || "Father",
        notes: student.notes || ""
      });
    }
  }, [student]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const url = isEdit ? `/api/wilma/users/${studentId}` : "/api/wilma/users";
      const method = isEdit ? "PUT" : "POST";
      
      // Clean data - remove parent 2 fields if not enabled
      const cleanData = { ...data };
      if (!data.hasParent2) {
        delete cleanData.parent2FirstName;
        delete cleanData.parent2LastName;
        delete cleanData.parent2Email;
        delete cleanData.parent2Phone;
        delete cleanData.parent2Relationship;
      }
      
      // Remove secondary address fields if not enabled
      if (!data.hasSecondAddress) {
        delete cleanData.address2;
        delete cleanData.city2;
        delete cleanData.postalCode2;
      }
      
      // Remove hasParent2 and hasSecondAddress flags (not needed in DB)
      delete cleanData.hasParent2;
      delete cleanData.hasSecondAddress;
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...cleanData,
          role: "student",
          username: cleanData.email ? cleanData.email.split('@')[0] : `${cleanData.firstName}.${cleanData.lastName}`.toLowerCase(),
          password: isEdit ? undefined : generateRandomPassword(),
          isActive: true,
          isTemporaryPassword: !isEdit
        })
      });
      
      if (!response.ok) throw new Error("Failed to save student");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      alert(`✅ Opiskelija ${isEdit ? "päivitetty" : "luotu"} onnistuneesti!`);
      setLocation(`/wilma-admin/${adminId}/students`);
    },
    onError: (error: any) => {
      alert(`❌ Opiskelijan tallennus epäonnistui: ${error.message}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-2 md:p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-4 md:mb-6 flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
          <Button
            variant="outline"
            onClick={() => setLocation(`/wilma-admin/${adminId}/students`)}
            className="flex items-center gap-2 w-full md:w-auto"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Takaisin hallintaan
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {isEdit ? "Muokkaa opiskelijaa" : "Lisää uusi opiskelija"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card className="border-2 border-blue-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Perustiedot (Basic Information)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Etunimi (First Name) *</Label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Sukunimi (Last Name) *</Label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Sähköposti (Email)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="etunimi.sukunimi@ksyk.fi"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const autoEmail = `${formData.firstName.toLowerCase()}.${formData.lastName.toLowerCase()}@ksyk.fi`;
                        setFormData({ ...formData, email: autoEmail });
                      }}
                      disabled={!formData.firstName || !formData.lastName}
                      className="whitespace-nowrap"
                    >
                      Luo automaattisesti
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Jätetään tyhjäksi jos haluat luoda automaattisesti
                  </p>
                </div>
                <div>
                  <Label>Luokka (Class) *</Label>
                  <Input
                    value={formData.studentClass}
                    onChange={(e) => setFormData({ ...formData, studentClass: e.target.value })}
                    placeholder="esim. 9A"
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Syntymäaika (Date of Birth)</Label>
                  <Input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Puhelin (Phone)</Label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+358 XX XXX XXXX"
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Primary Address */}
          <Card className="border-2 border-green-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="flex items-center gap-2">
                <Home className="w-5 h-5 text-green-600" />
                Ensisijainen osoite (Primary Address)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label>Katuosoite (Street Address)</Label>
                <Input
                  value={formData.address1}
                  onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
                  placeholder="Kadun nimi ja numero"
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Kaupunki (City)</Label>
                  <Input
                    value={formData.city1}
                    onChange={(e) => setFormData({ ...formData, city1: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Postinumero (Postal Code)</Label>
                  <Input
                    value={formData.postalCode1}
                    onChange={(e) => setFormData({ ...formData, postalCode1: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Secondary Address (Divorced Parents) */}
          <Card className="border-2 border-orange-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Home className="w-5 h-5 text-orange-600" />
                  Toissijainen osoite (Secondary Address) - Valinnainen
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hasSecondAddress}
                    onChange={(e) => setFormData({ ...formData, hasSecondAddress: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-normal">Toinen osoite</span>
                </label>
              </CardTitle>
            </CardHeader>
            {formData.hasSecondAddress && (
              <CardContent className="p-6 space-y-4">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-orange-800">
                    <AlertCircle className="w-4 h-4 inline mr-2" />
                    Käytä tätä opiskelijoille, joilla on eronnut vanhemmat tai jaettu huoltajuus
                  </p>
                </div>
                <div>
                  <Label>Katuosoite (Street Address)</Label>
                  <Input
                    value={formData.address2}
                    onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
                    placeholder="Kadun nimi ja numero"
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Kaupunki (City)</Label>
                    <Input
                      value={formData.city2}
                      onChange={(e) => setFormData({ ...formData, city2: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Postinumero (Postal Code)</Label>
                    <Input
                      value={formData.postalCode2}
                      onChange={(e) => setFormData({ ...formData, postalCode2: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Emergency Contact */}
          <Card className="border-2 border-red-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50">
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-red-600" />
                Hätäyhteystieto (Emergency Contact)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Yhteyshenkilön nimi (Contact Name)</Label>
                  <Input
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                    placeholder="Koko nimi"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Puhelinnumero (Contact Phone)</Label>
                  <Input
                    type="tel"
                    value={formData.emergencyPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                    placeholder="+358 XX XXX XXXX"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Suhde (Relationship)</Label>
                  <Input
                    value={formData.emergencyRelationship}
                    onChange={(e) => setFormData({ ...formData, emergencyRelationship: e.target.value })}
                    placeholder="esim. Äiti, Isä, Huoltaja"
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Medical Information */}
          <Card className="border-2 border-purple-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-purple-600" />
                Terveystiedot (Medical Information)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label>Allergiat (Allergies)</Label>
                <Input
                  value={formData.allergies}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  placeholder="Ruoka-allergiat, ympäristöallergiat jne."
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Lääkitys (Medications)</Label>
                <Input
                  value={formData.medications}
                  onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                  placeholder="Säännöllinen lääkitys"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Muut terveystiedot (Other Medical Information)</Label>
                <textarea
                  value={formData.medicalInfo}
                  onChange={(e) => setFormData({ ...formData, medicalInfo: e.target.value })}
                  placeholder="Krooniset sairaudet, erityistarpeet jne."
                  className="w-full border rounded-md px-3 py-2 mt-1 min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Parent 1 Information */}
          <Card className="border-2 border-indigo-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Huoltaja 1 (Parent 1)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Etunimi (First Name)</Label>
                  <Input
                    value={formData.parent1FirstName}
                    onChange={(e) => setFormData({ ...formData, parent1FirstName: e.target.value })}
                    placeholder="Esim. Maria"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Sukunimi (Last Name)</Label>
                  <Input
                    value={formData.parent1LastName}
                    onChange={(e) => setFormData({ ...formData, parent1LastName: e.target.value })}
                    placeholder="Esim. Virtanen"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Sähköposti (Email)</Label>
                  <Input
                    type="email"
                    value={formData.parent1Email}
                    onChange={(e) => setFormData({ ...formData, parent1Email: e.target.value })}
                    placeholder="maria.virtanen@email.fi"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Puhelin (Phone)</Label>
                  <Input
                    type="tel"
                    value={formData.parent1Phone}
                    onChange={(e) => setFormData({ ...formData, parent1Phone: e.target.value })}
                    placeholder="+358 XX XXX XXXX"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Suhde (Relationship)</Label>
                  <select
                    value={formData.parent1Relationship}
                    onChange={(e) => setFormData({ ...formData, parent1Relationship: e.target.value })}
                    className="w-full border rounded-md px-3 py-2 mt-1 h-10"
                  >
                    <option value="Mother">Äiti / Mother</option>
                    <option value="Father">Isä / Father</option>
                    <option value="Guardian">Huoltaja / Guardian</option>
                    <option value="Other">Muu / Other</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Parent 2 Information (Optional) */}
          <Card className="border-2 border-purple-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Huoltaja 2 (Parent 2) - Valinnainen (Optional)
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hasParent2}
                    onChange={(e) => setFormData({ ...formData, hasParent2: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-normal">Lisää toinen huoltaja</span>
                </label>
              </CardTitle>
            </CardHeader>
            {formData.hasParent2 && (
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Etunimi (First Name)</Label>
                    <Input
                      value={formData.parent2FirstName}
                      onChange={(e) => setFormData({ ...formData, parent2FirstName: e.target.value })}
                      placeholder="Esim. Pekka"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Sukunimi (Last Name)</Label>
                    <Input
                      value={formData.parent2LastName}
                      onChange={(e) => setFormData({ ...formData, parent2LastName: e.target.value })}
                      placeholder="Esim. Virtanen"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Sähköposti (Email)</Label>
                    <Input
                      type="email"
                      value={formData.parent2Email}
                      onChange={(e) => setFormData({ ...formData, parent2Email: e.target.value })}
                      placeholder="pekka.virtanen@email.fi"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Puhelin (Phone)</Label>
                    <Input
                      type="tel"
                      value={formData.parent2Phone}
                      onChange={(e) => setFormData({ ...formData, parent2Phone: e.target.value })}
                      placeholder="+358 XX XXX XXXX"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Suhde (Relationship)</Label>
                    <select
                      value={formData.parent2Relationship}
                      onChange={(e) => setFormData({ ...formData, parent2Relationship: e.target.value })}
                      className="w-full border rounded-md px-3 py-2 mt-1 h-10"
                    >
                      <option value="Father">Isä / Father</option>
                      <option value="Mother">Äiti / Mother</option>
                      <option value="Guardian">Huoltaja / Guardian</option>
                      <option value="Other">Muu / Other</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Additional Notes */}
          <Card className="border-2 border-gray-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50">
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-gray-600" />
                Lisätiedot (Additional Notes)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Muita tietoja opiskelijasta..."
                className="w-full border rounded-md px-3 py-2 min-h-[120px]"
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 sticky bottom-2 md:bottom-4 bg-white p-3 md:p-4 rounded-lg shadow-lg border-2 border-blue-200">
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 h-12 text-base md:text-lg"
              disabled={saveMutation.isPending}
            >
              <Save className="w-5 h-5 mr-2" />
              {saveMutation.isPending ? "Tallennetaan..." : isEdit ? "Päivitä opiskelija" : "Luo opiskelija"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation(`/wilma-admin/${adminId}/students`)}
              className="h-12 md:w-auto"
            >
              Peruuta
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
