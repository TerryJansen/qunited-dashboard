const f = (key, label, type = 'text', required = false, extra = {}) => ({ key, label, type, required, ...extra });
const named = (records, id) => records.find(r => r.id === id)?.name || 'Verwijderde referentie';

export function safeUrl(value) {
 try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}

export const modules = {
 projecten:{title:'Projecten',identityLabel:'Project',subField:'client',plural:'projecten',singular:'project',description:'Planning en voortgang van je eigen projecten.',states:['Planning','In uitvoering','Afgerond','Geannuleerd'],period:{start:'start',end:'due'},fields:[f('name','Projectnaam','text',true),f('client','Klant'),f('location','Locatie','text',true,{hint:'Adres, postcode of plaats. Offshore: de haven of heliport waar de reis eindigt. Hiermee wordt de reistijd berekend.'}),f('owner','Verantwoordelijke','reference',false,{source:'personeel'}),f('start','Startdatum','date'),f('due','Einddatum','date'),f('progress','Voortgang (%)','number',false,{min:0,max:100,step:1}),f('needed','Benodigde bezetting','number',false,{min:1,max:999,step:1}),f('notes','Notities','textarea')]},
 inzet:{
  title:'Inzet',identityLabel:'Medewerker en project',subField:'role',plural:'inzetregistraties',singular:'inzetregistratie',
  description:'Wie staat op welk project en in welke periode. Alleen je eigen registratie: er wordt niemand ingepland of op de hoogte gebracht.',
  // Geen eigen menu-item: inzet plan je vanuit de Planning, door op een dag te klikken.
  hidden:true,
  states:['Gepland','Actief','Afgerond','Geannuleerd'],
  // Geen eigen naamveld: de titel komt uit medewerker en project.
  derivedName:(record,data)=>`${named(data.personeel,record.employeeId)} — ${named(data.projecten,record.projectId)}`,
  titleFields:['employeeId','projectId'],
  period:{start:'start',end:'end'},
  fields:[f('employeeId','Medewerker','reference',true,{source:'personeel'}),f('projectId','Project','reference',true,{source:'projecten'}),f('role','Rol op project'),f('start','Van','date',true),f('end','Tot en met','date'),f('hoursPerDay','Uren per dag','duration',false,{min:0.01,max:24}),f('pause','Pauze per dag','pause'),f('travelFrom','Vertrek vanaf'),f('travel','Reistijd per dag (heen en terug)','pause',false,{options:[0,15,30,45,60,90,120,180]}),f('notes','Notities','textarea')]
 },
 afwezigheid:{
  title:'Afwezigheid',plural:'afwezigheidsregistraties',singular:'afwezigheidsregistratie',identityLabel:'Medewerker en soort',subField:'notes',
  description:'Vakantie, ziekte en verlof. Zonder deze registratie telt iemand zonder inzet als beschikbaar, ook als dat niet klopt.',
  states:['Aangevraagd','Vastgelegd','Vervallen'],
  derivedName:(record,data)=>`${named(data.personeel,record.employeeId)} — ${record.kind||'Afwezig'}`,
  titleFields:['employeeId','kind'],
  period:{start:'start',end:'end'},
  fields:[f('employeeId','Medewerker','reference',true,{source:'personeel'}),f('kind','Soort','select',false,{options:['Vakantie','Ziek','Verlof','Opleiding']}),f('start','Van','date',true),f('end','Tot en met','date',true),f('notes','Notities','textarea')]
 },
 urenstaten:{title:'Urenstaten',identityLabel:'Omschrijving',plural:'urenregistraties',singular:'urenregistratie',description:'Uren per medewerker en project. Statussen zijn interne registraties, geen formele goedkeuring of verzending.',states:['Concept','Ingediend','Goedgekeurd'],fields:[f('name','Omschrijving','text',true),f('employeeId','Medewerker','reference',true,{source:'personeel'}),f('projectId','Project','reference',true,{source:'projecten'}),f('date','Werkdatum','date',true),f('hours','Uren','duration',true,{min:0.01,max:24}),f('pause','Pauze','pause',true)],
  // Een nieuwe urenregel begint op een gewone werkdag; de wielen en knoppen staan dan meteen goed.
  defaults:{hours:'8',pause:'30'},maxColumns:5},
 personeel:{title:'Personeel',identityLabel:'Medewerker',subField:'role',plural:'medewerkers',singular:'medewerker',description:'Personeelsgegevens, cv’s en certificaten blijven alleen op dit apparaat in deze browser. Niets wordt centraal geüpload.',states:['Actief','Inactief'],fields:[f('name','Naam','text',true),f('role','Functie'),f('email','E-mailadres','email'),f('phone','Telefoon'),f('home','Vertrekadres','text',false,{hint:'Waar hij meestal vandaan rijdt: straat en plaats, of alleen postcode of plaats. Voor de reistijd in de planning.'}),f('notes','Notities','textarea')]},
 materiaal:{title:'Materiaal',identityLabel:'Omschrijving',subField:'supplier',plural:'materiaalregels',singular:'materiaalregel',description:'Registreer materiaalbehoefte. Er wordt niets besteld of gereserveerd.',states:['Nodig','Beschikbaar','In gebruik','Afgehandeld'],fields:[f('name','Omschrijving','text',true),f('quantity','Aantal','number',false,{min:1,step:1}),f('unit','Eenheid'),f('project','Project','reference',false,{source:'projecten'}),f('supplier','Leverancier'),f('due','Benodigd op','date'),f('notes','Notities','textarea')]},
 inventaris:{title:'Inventaris',identityLabel:'Item',subField:'serial',plural:'inventarisitems',singular:'inventarisitem',description:'Je eigen overzicht van materieel en gereedschap.',states:['Beschikbaar','In gebruik','Onderhoud','Afgeschreven'],fields:[f('name','Itemnaam','text',true),f('serial','Assetnummer / serienummer'),f('quantity','Aantal','number',false,{min:1,step:1}),f('location','Locatie'),f('owner','Toegewezen aan','reference',false,{source:'personeel'}),f('due','Volgende inspectie','date'),f('notes','Notities','textarea')]},
 facturatie:{title:'Facturatie',identityLabel:'Factuur',subField:'client',plural:'facturen',singular:'factuur',description:'Interne registratie; geen verzending, betaling of boekhoudkoppeling.',states:['Open','Betaald','Geannuleerd'],fields:[f('name','Factuurnummer','text',true),f('client','Relatie','text',true),f('amount','Bedrag (€)','number',true,{min:0.01,max:999999999,step:0.01}),f('date','Factuurdatum','date'),f('due','Vervaldatum','date'),f('notes','Notities','textarea')]},
 support:{title:'IT & support',identityLabel:'Onderwerp',subField:'reporter',plural:'meldingen',singular:'melding',description:'Lokale notities; meldingen worden niet naar een helpdesk verstuurd.',states:['Open','In behandeling','Opgelost'],fields:[f('name','Onderwerp','text',true),f('reporter','Melder','reference',false,{source:'personeel'}),f('device','Apparaat / systeem'),f('priority','Prioriteit','select',false,{options:['Normaal','Laag','Hoog']}),f('notes','Beschrijving','textarea')]},
 procedures:{
  title:'Procedures',identityLabel:'Procedure',subField:'owner',plural:'procedures',singular:'procedure',description:'Bewaar je eigen teksten en documentverwijzingen. Geen vooraf ingevulde instructies.',states:['Concept','Actueel','Gearchiveerd'],
  validate:record => {
   if (record.url && !safeUrl(record.url)) return 'Gebruik een geldige http- of https-documentlink.';
   if (!record.content && !record.url) return 'Voeg inhoud of een documentlink toe.';
   return '';
  },
  fields:[f('name','Titel','text',true),f('owner','Eigenaar','reference',false,{source:'personeel'}),f('version','Versie'),f('due','Herzien op','date'),f('content','Inhoud','textarea'),f('url','Documentlink','url')]
 }
};

export const emptyData = () => Object.fromEntries(Object.keys(modules).map(key => [key, []]));
export const STORAGE_KEY = 'qunited.records.v1';
export const reference = named;

// Modules die naar `key` verwijzen, met het veld waarin dat gebeurt.
export const dependentsOf = key => Object.entries(modules)
 .flatMap(([module, m]) => m.fields.filter(field => field.source === key).map(field => ({ module, title: m.title, field: field.key })));

/** Een id dat crypto.randomUUID heeft gemaakt. Alles wat daar niet op lijkt is oude, met de hand getypte tekst. */
export const looksLikeId = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/**
 * Wat er in een verwijzingsveld staat: een bestaande registratie, een verwijderde,
 * of tekst van vóór dit veld een keuzelijst werd.
 */
export function resolveReference(data, source, value) {
 if (!value) return { kind: 'leeg' };
 const found = data[source]?.find(item => item.id === value);
 if (found) return { kind: 'record', record: found };
 if (looksLikeId(value)) return { kind: 'verwijderd' };
 return { kind: 'tekst', text: value };
}

/** De tweede regel onder een rijtitel: tekst, of de naam waar het veld naar verwijst. */
export function subText(moduleId, record, data) {
 const m = modules[moduleId];
 if (!m.subField) return '';
 const field = m.fields.find(item => item.key === m.subField);
 const value = record[m.subField];
 if (!value) return '';
 if (!field?.source) return value;
 const link = resolveReference(data, field.source, value);
 return link.kind === 'record' ? link.record.name : link.kind === 'tekst' ? link.text : 'Verwijderde referentie';
}
