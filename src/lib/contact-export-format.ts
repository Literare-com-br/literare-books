
import { csvCell } from './dashboard-validation';
import { contactAreaLabel } from '../data/contact-areas';
import type { Contact } from '../types/dashboard';

const statuses={pending:'Pendente',in_progress:'Em atendimento',completed:'Concluído'};
export const contactHeaders=['Nome','E-mail','Telefone','Área de atuação','Mensagem','Status','Data de cadastro'];
export function contactExportRows(contacts:Contact[]) {
  const date=new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'medium',timeZone:'America/Sao_Paulo'});
  return [contactHeaders,...contacts.map(c=>[c.name,c.email,c.phone,contactAreaLabel(c),c.message,statuses[c.status],date.format(new Date(c.created_at))])];
}
export function contactsCSV(contacts:Contact[]) {return '\uFEFF'+contactExportRows(contacts).map(row=>row.map(csvCell).join(';')).join('\r\n');}

