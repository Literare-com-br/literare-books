export const CONTACT_AREAS = ['Psicologia','Educação','Saúde','Administração','Direito','Tecnologia','Empreendedorismo','Recursos Humanos','Literatura','Outros'] as const;
export function contactAreaLabel(contact: {area_of_activity?: string | null; area_of_activity_other?: string | null}) {
  return contact.area_of_activity === 'Outros' ? contact.area_of_activity_other || 'Outros' : contact.area_of_activity || 'Não informado';
}
