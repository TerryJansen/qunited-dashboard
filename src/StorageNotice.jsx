import React, { useEffect, useState } from 'react';
import { storageSafety, daysSinceBackup, BACKUP_REMINDER_DAYS } from './persist';

/**
 * Eén korte melding als de gegevens niet veilig bewaard worden, met de ene handeling die helpt.
 * Geen melding als het goed zit: wie niets hoeft te doen, krijgt ook niets te lezen.
 */
export function StorageNotice() {
 const [safety, setSafety] = useState('veilig');
 useEffect(() => { storageSafety().then(setSafety); }, []);

 if (safety === 'iphone') return <div className="notice warn" role="note" data-testid="storage-notice">
  <b>Zet Qunited op je beginscherm.</b> Anders kan je iPhone de gegevens na een week zonder bezoek wissen.
  Tik onderin op <b>Deel</b> en kies <b>Zet op beginscherm</b>. Zie je die keuze niet? Open de site dan eerst in Safari.
 </div>;

 if (safety === 'onzeker') return <div className="notice warn" role="note" data-testid="storage-notice">
  <b>Deze browser bewaart je gegevens misschien niet.</b> Gebruik een gewoon venster, geen privévenster,
  en maak regelmatig een back-up.
 </div>;

 return null;
}

/** Herinnering om een back-up te maken, zodra er iets te verliezen valt. */
export function BackupReminder({ hasData }) {
 const days = daysSinceBackup();
 if (!hasData) return null;
 if (days !== null && days < BACKUP_REMINDER_DAYS) return null;
 return <div className="notice info" role="note" data-testid="backup-reminder">
  {days === null ? 'Je hebt nog geen back-up gemaakt.' : `Je laatste back-up is ${days} dagen oud.`}{' '}
  <a href="#/backup">Back-up maken</a>
 </div>;
}
