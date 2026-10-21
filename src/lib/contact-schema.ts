import { z } from './validation';

import { CONTACT_AREAS } from '../data/contact-areas';
export const contactSchema = z.object({
  name: z.string().trim().min(3, 'Informe seu nome completo.').max(120, 'Use até 120 caracteres.'),
  email: z.email('Informe um e-mail válido.').max(254),
  phone: z.string().trim().regex(/^[+\d\s().-]{10,22}$/, 'Informe um telefone com DDD.'),
  message: z.string().trim().min(15, 'Conte um pouco mais: ao menos 15 caracteres.').max(3000, 'Use até 3.000 caracteres.'),
  area_of_activity: z.enum(CONTACT_AREAS, {error: 'Selecione sua área de atuação.'}),
  area_of_activity_other: z.string().trim().max(100,'Use até 100 caracteres.').optional(),
}).superRefine((value, context) => {
  if(value.area_of_activity==='Outros' && (value.area_of_activity_other?.length??0)<3) context.addIssue({code:'custom',path:['area_of_activity_other'],message:'Informe sua área de atuação (ao menos 3 caracteres).'});
});
export type ContactData = z.infer<typeof contactSchema>;


