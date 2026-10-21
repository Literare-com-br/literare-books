import { useCallback, useState } from 'react';
import { Download } from 'lucide-react';
import { useDashboardQuery } from '../../hooks/use-dashboard-query';
import { fetchReport } from '../../lib/dashboard';
import { csvCell } from '../../lib/dashboard-validation';
import { QueryState } from '../../components/dashboard/shared';
const localDate=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const titles:Record<string,string>={contacts_monthly:'Contatos por mês',contacts_status:'Contatos por status',coauthors_status:'Coautorias abertas e fechadas',books_monthly:'Coautorias cadastradas por mês',books_categories:'Coautorias por categoria',catalog_monthly:'Catálogo cadastrado por mês',catalog_categories:'Catálogo por categoria'};
const labels:Record<string,string>={pending:'Pendente',in_progress:'Em atendimento',completed:'Concluído',open:'Abertas',closed:'Encerradas'};
export default function Reports() {
  const [days,setDays]=useState('30'),[from,setFrom]=useState(()=>{const d=new Date();d.setDate(d.getDate()-29);return localDate(d);}),[to,setTo]=useState(()=>localDate(new Date()));
  const valid=!!from&&!!to&&from<=to;
  const loader=useCallback((signal:AbortSignal)=>{if(!valid) return Promise.reject(new Error('Selecione um período válido.'));const end=new Date(`${to}T00:00:00`);end.setDate(end.getDate()+1);return fetchReport(new Date(`${from}T00:00:00`).toISOString(),end.toISOString(),signal);},[from,to,valid]);
  const query=useDashboardQuery(loader);
  function exportCSV() {
    if(!query.data) return;
    const lines=[['Relatório','Categoria','Quantidade','De','Até'],...Object.entries(query.data).flatMap(([key,rows])=>rows.map(r=>[titles[key]??key,labels[r.label]??r.label,r.value,from,to]))];
    const url=URL.createObjectURL(new Blob(['\uFEFF'+lines.map(row=>row.map(csvCell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8;'}));
    const link=document.createElement('a');link.href=url;link.download=`literare-relatorios-${from}-${to}.csv`;link.click();URL.revokeObjectURL(url);
  }
  return <><div className="dash-page-heading"><div><span className="dash-eyebrow">DADOS PARA DECIDIR</span><h1>Relatórios</h1><p>Resultados dos módulos que sua conta tem autorização para consultar.</p></div><button disabled={!query.data} onClick={exportCSV}><Download size={17} />Exportar CSV</button></div><div className="dash-filters"><label>Período<select aria-label="Período" value={days} onChange={e=>{const value=e.target.value;setDays(value);if(value!=='custom'){const date=new Date();date.setDate(date.getDate()-Number(value)+1);setFrom(localDate(date));setTo(localDate(new Date()));}}}><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="custom">Personalizado</option></select></label><label>De<input type="date" required max={to} value={from} onChange={e=>{setDays('custom');setFrom(e.target.value);}} /></label><label>Até<input type="date" required min={from} value={to} onChange={e=>{setDays('custom');setTo(e.target.value);}} /></label></div><p className="dash-muted">Os gráficos de livros consideram coautorias cadastradas no período. Status representam a situação atual desses registros. Datas apresentadas em horário de São Paulo.</p><QueryState {...query} retry={query.reload} />{query.data&&<div className="dash-report-grid">{Object.entries(query.data).length===0&&<p>Nenhum módulo de origem foi autorizado para relatórios. Solicite ao administrador permissão para coautorias ou contatos.</p>}{Object.entries(query.data).map(([key,rows])=><section className="dash-card" key={key}><h2>{titles[key]??key}</h2>{rows.length?<ul className="dash-chart" aria-label={titles[key]}>{rows.map(row=><li key={row.label}><div><span>{labels[row.label]??row.label}</span><strong>{row.value.toLocaleString('pt-BR')}</strong></div><div className="dash-bar-track"><span style={{width:`${Math.max(1,row.value/Math.max(...rows.map(r=>r.value),1)*100)}%`}} /></div></li>)}</ul>:<p>Nenhum registro neste período.</p>}</section>)}</div>}</>;
}

