import { supabase } from './supabase';
import {contactSchema, type ContactData} from './contact-schema';
export {contactSchema, type ContactData} from './contact-schema';
export async function submitContact(data: ContactData, turnstileToken = '', website = ''): Promise<{ sent: boolean; message: string }> {
  const parsed = contactSchema.safeParse(data);
  if (!parsed.success) return { sent: false, message: 'Confira os campos antes de enviar.' };
  if (!supabase) return { sent: false, message: 'O envio ainda não está configurado. Sua mensagem não foi enviada. Tente novamente mais tarde.' };
  if(!turnstileToken) return {sent:false,message:'Conclua a verificação de segurança antes de enviar.'};
  try {
    const { data: result, error } = await supabase.functions.invoke('submit-contact',{body:{...parsed.data,area_of_activity_other:parsed.data.area_of_activity==='Outros'?parsed.data.area_of_activity_other:'',turnstileToken,website}});
    if (error || !result?.sent) throw new Error('Envio não confirmado.');
    return { sent: true, message: 'Mensagem enviada com sucesso. Obrigado pelo contato!' };
  } catch {
    return { sent: false, message: 'Não foi possível enviar sua mensagem. Seus dados foram mantidos. Tente novamente.' };
  }
}

