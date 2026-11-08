import { useEffect, useState } from 'react';

/** Telefoonbreedte: daar krijgen schermen hun eigen, eenvoudiger opzet. */
export default function useNarrow() {
 const [narrow, setNarrow] = useState(() => typeof matchMedia === 'function' && matchMedia('(max-width: 860px)').matches);
 useEffect(() => {
  const query = matchMedia('(max-width: 860px)');
  const change = () => setNarrow(query.matches);
  query.addEventListener('change', change);
  return () => query.removeEventListener('change', change);
 }, []);
 return narrow;
}
