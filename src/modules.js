const f = (key, label, type = 'text', required = false, extra = {}) => ({ key, label, type, required, ...extra });
const named = (records, id) => records.find(r => r.id === id)?.name || 'Verwijderde referentie';

export function safeUrl(value) {
 try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}

export const modules = {
 projecten:{title:'Projecten',plural:'projecten',singular:'project',description:'Planning en voortgang van je eigen projecten.',states:['Planning','In uitvoering','Afgerond','Geannuleerd'],period:{start:'start',end:'due'},fields:[f('name','Projectnaam','text',true),f('client','Klant'),f('location','Locatie'),f('owner','Verantwoordelijke'),f('start','Startdatum','date'),f('due','Einddatum','date'),f('progress','Voortgang (%)','number',false,{min:0,max:100,step:1}),f('notes','Notities','textarea')]},
 inzet:{
  title:'Inzet',plural:'inzetregistraties',singular:'inzetregistratie',
  description:'Wie staat op welk project en in welke periode. Alleen je eigen registratie: er wordt niemand ingepland of op de hoogte gebracht.',
  states:['Gepland','Actief','Afgerond','Geannuleerd'],
  // Geen eigen naamveld: de titel komt uit medewerker en project.
  derivedName:(record,data)=>`${named(data.personeel,record.employeeId)} — ${named(data.projecten,record.projectId)}`,
  titleFields:['employeeId','projectId'],
  period:{start:'start',end:'end'},
  fields:[f('employeeId','Medewerker','reference',true,{source:'personeel'}),f('projectId','Project','reference',true,{source:'projecten'}),f('role','Rol op project'),f('start','Van','date',true),f('end','Tot en met','date'),f('hoursPerWeek','Uren per week','number',false,{min:1,max:80,step:1}),f('notes','Notities','textarea')]
 },
 urenstaten:{title:'Urenstaten',plural:'urenregistraties',singular:'urenregistratie',description:'Uren per medewerker en project. Statussen zijn interne registraties, geen formele goedkeuring of verzending.',states:['Concept','Ingediend','Goedgekeurd'],fields:[f('name','Omschrijving','text',true),f('employeeId','Medewerker','reference',true,{source:'personeel'}),f('projectId','Project','reference',true,{source:'projecten'}),f('date','Werkdatum','date',true),f('hours','Uren','number',true,{min:0.01,max:24,step:0.01})]},
 personeel:{title:'Personeel',plural:'medewerkers',singular:'medewerker',description:'Personeelsgegevens, cv’s en certificaten blijven alleen op dit apparaat in deze browser. Niets wordt centraal geüpload.',states:['Actief','Inactief'],fields:[f('name','Naam','text',true),f('role','Functie'),f('email','E-mailadres','email'),f('phone','Telefoon'),f('notes','Notities','textarea')]},
 materiaal:{title:'Materiaal',plural:'materiaalregels',singular:'materiaalregel',description:'Registreer materiaalbehoefte. Er wordt niets besteld of gereserveerd.',states:['Nodig','Beschikbaar','In gebruik','Afgehandeld'],fields:[f('name','Omschrijving','text',true),f('quantity','Aantal','number',false,{min:1,step:1}),f('unit','Eenheid'),f('project','Project / referentie'),f('supplier','Leverancier'),f('due','Benodigd op','date'),f('notes','Notities','textarea')]},
 inventaris:{title:'Inventaris',plural:'inventarisitems',singular:'inventarisitem',description:'Je eigen overzicht van materieel en gereedschap.',states:['Beschikbaar','In gebruik','Onderhoud','Afgeschreven'],fields:[f('name','Itemnaam','text',true),f('serial','Assetnummer / serienummer'),f('quantity','Aantal','number',false,{min:1,step:1}),f('location','Locatie'),f('owner','Toegewezen aan'),f('due','Volgende inspectie','date'),f('notes','Notities','textarea')]},
 facturatie:{title:'Facturatie',plural:'facturen',singular:'factuur',description:'Interne registratie; geen verzending, betaling of boekhoudkoppeling.',states:['Open','Betaald','Geannuleerd'],fields:[f('name','Factuurnummer','text',true),f('client','Relatie','text',true),f('amount','Bedrag (€)','number',true,{min:0.01,max:999999999,step:0.01}),f('date','Factuurdatum','date'),f('due','Vervaldatum','date'),f('notes','Notities','textarea')]},
 support:{title:'IT & support',plural:'meldingen',singular:'melding',description:'Lokale notities; meldingen worden niet naar een helpdesk verstuurd.',states:['Open','In behandeling','Opgelost'],fields:[f('name','Onderwerp','text',true),f('reporter','Melder'),f('device','Apparaat / systeem'),f('priority','Prioriteit','select',false,{options:['Normaal','Laag','Hoog']}),f('notes','Beschrijving','textarea')]},
 procedures:{
  title:'Procedures',plural:'procedures',singular:'procedure',description:'Bewaar je eigen teksten en documentverwijzingen. Geen vooraf ingevulde instructies.',states:['Concept','Actueel','Gearchiveerd'],
  validate:record => {
   if (record.url && !safeUrl(record.url)) return 'Gebruik een geldige http- of https-documentlink.';
   if (!record.content && !record.url) return 'Voeg inhoud of een documentlink toe.';
   return '';
  },
  fields:[f('name','Titel','text',true),f('owner','Eigenaar'),f('version','Versie'),f('due','Herzien op','date'),f('content','Inhoud','textarea'),f('url','Documentlink','url')]
 }
};

export const emptyData = () => Object.fromEntries(Object.keys(modules).map(key => [key, []]));
export const STORAGE_KEY = 'qunited.records.v1';
export const reference = named;

// Modules die naar `key` verwijzen, met het veld waarin dat gebeurt.
export const dependentsOf = key => Object.entries(modules)
 .flatMap(([module, m]) => m.fields.filter(field => field.source === key).map(field => ({ module, title: m.title, field: field.key })));
