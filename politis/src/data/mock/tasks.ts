/**
 * ⚠️ MOCK / DEMO DATA — sample tasks seeded for demo users only.
 * Dates are relative to today so the demo always feels current.
 */
import type { Task } from '@/types/models';
import { daysFromNow } from '@/lib/dates';

export function buildMockTasks(): Task[] {
  const createdAt = daysFromNow(-7);
  const base = { createdAt, isMock: true } as const;
  return [
    { ...base, id: 'task_mock_1', title: 'Αίτηση για ενίσχυση ρεύματος', description: 'Η προθεσμία πλησιάζει.', dueDate: daysFromNow(2), status: 'pending', procedureId: 'proc_energy_application', benefitId: 'ben_energy_support' },
    { ...base, id: 'task_mock_2', title: 'Αίτηση στεγαστικής στήριξης', description: 'Η προθεσμία πλησιάζει.', dueDate: daysFromNow(4), status: 'pending', procedureId: 'proc_housing_application', benefitId: 'ben_youth_housing' },
    { ...base, id: 'task_mock_3', title: 'Έκδοση πιστοποιητικού οικογενειακής κατάστασης', dueDate: daysFromNow(8), status: 'pending', procedureId: 'proc_family_certificate' },
    { ...base, id: 'task_mock_4', title: 'Αποδοχή μισθωτηρίου', dueDate: daysFromNow(12), status: 'pending', procedureId: 'proc_lease_declaration' },
    { ...base, id: 'task_mock_5', title: 'Αίτηση σε πρόγραμμα κατάρτισης', dueDate: daysFromNow(14), status: 'pending', procedureId: 'proc_training_application', benefitId: 'ben_job_training' },
    { ...base, id: 'task_mock_6', title: 'Συγκέντρωση αποδείξεων για τη φορολογική δήλωση', description: 'Μάζεψε αποδείξεις δαπανών του έτους.', dueDate: daysFromNow(40), status: 'pending', procedureId: 'proc_tax_return' },
    { ...base, id: 'task_mock_7', title: 'Αλλαγή διεύθυνσης κατοικίας', status: 'done', procedureId: 'proc_address_change', completedAt: daysFromNow(-3), dueDate: daysFromNow(-2) },
    { ...base, id: 'task_mock_8', title: 'Ανανέωση ασφαλιστηρίου αυτοκινήτου', description: 'Έλεγξε την ημερομηνία λήξης στο ασφαλιστήριο.', dueDate: daysFromNow(-1), status: 'pending' },
  ];
}
