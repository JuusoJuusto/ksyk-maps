/**
 * Certificate Generator
 * Generates PDF certificates for course completion
 */

import jsPDF from 'jspdf';

export interface CertificateData {
  studentName: string;
  courseName: string;
  completionDate: string;
  grade?: string;
  instructorName?: string;
  courseHours?: number;
}

export function generateCertificate(data: CertificateData): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Background color
  doc.setFillColor(245, 247, 250);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Border
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(2);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Inner border
  doc.setLineWidth(0.5);
  doc.rect(15, 15, pageWidth - 30, pageHeight - 30);

  // Logo/Icon area (top)
  doc.setFillColor(37, 99, 235);
  doc.circle(pageWidth / 2, 35, 15, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('🎓', pageWidth / 2, 40, { align: 'center' });

  // Title
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIFICATE OF COMPLETION', pageWidth / 2, 65, { align: 'center' });

  // Subtitle
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('This is to certify that', pageWidth / 2, 80, { align: 'center' });

  // Student name
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(data.studentName, pageWidth / 2, 95, { align: 'center' });

  // Underline for name
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  const nameWidth = doc.getTextWidth(data.studentName);
  doc.line(
    (pageWidth - nameWidth) / 2,
    97,
    (pageWidth + nameWidth) / 2,
    97
  );

  // Course completion text
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('has successfully completed the course', pageWidth / 2, 110, { align: 'center' });

  // Course name
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(data.courseName, pageWidth / 2, 125, { align: 'center' });

  // Details section
  const detailsY = 145;
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  if (data.courseHours) {
    doc.text(`Course Duration: ${data.courseHours} hours`, pageWidth / 2, detailsY, { align: 'center' });
  }

  if (data.grade) {
    doc.text(`Final Grade: ${data.grade}`, pageWidth / 2, detailsY + 6, { align: 'center' });
  }

  // Date
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(12);
  doc.text(`Completion Date: ${data.completionDate}`, pageWidth / 2, detailsY + 15, { align: 'center' });

  // Signature line
  const signatureY = pageHeight - 40;
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.line(40, signatureY, 100, signatureY);

  doc.setTextColor(80, 80, 80);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text(data.instructorName || 'Instructor', 70, signatureY + 5, { align: 'center' });
  doc.text('Instructor Signature', 70, signatureY + 10, { align: 'center' });

  // Platform branding
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Wilma Coding Platform', pageWidth / 2, pageHeight - 15, { align: 'center' });
  doc.text('© 2026 KSYK Maps', pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Verification code (bottom right)
  const verificationCode = `CERT-${Date.now().toString(36).toUpperCase()}`;
  doc.setFontSize(8);
  doc.text(`Verification: ${verificationCode}`, pageWidth - 20, pageHeight - 8, { align: 'right' });

  // Save the PDF
  const fileName = `certificate-${data.courseName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;
  doc.save(fileName);
}

export function generateCourseCertificate(
  studentName: string,
  courseName: string,
  courseHours: number,
  completionDate?: Date
): void {
  const date = completionDate || new Date();
  const formattedDate = date.toLocaleDateString('fi-FI', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  generateCertificate({
    studentName,
    courseName,
    completionDate: formattedDate,
    courseHours,
    instructorName: 'Wilma Coding Team',
  });
}

export function canGenerateCertificate(progressPercentage: number): boolean {
  return progressPercentage >= 100;
}
