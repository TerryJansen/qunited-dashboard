import React from 'react';

// Eén eenvoudige lijnstijl voor het hele menu en de kaarten: 16 bij 16, ronde uiteinden.
const PATHS = {
 dashboard: 'M2.5 2.5h4.5v6H2.5zM9 2.5h4.5v3.5H9zM9 8h4.5v5.5H9zM2.5 10.5h4.5v3H2.5z',
 rapportages: 'M4 1.5h5.5L12.5 4.5v10h-8.5zM9.5 1.5v3h3M6 8h4.5M6 10.5h4.5',
 projecten: 'M1.5 4.5h5l1.5 1.5h6.5v7.5h-13zM1.5 4.5v-1.5h4l1 1.5',
 planning: 'M2 3.5h12v10.5H2zM2 6.5h12M5 1.5v3M11 1.5v3M5 9.5h2M9 9.5h2',
 urenstaten: 'M8 2.5a5.5 5.5 0 1 0 0 11a5.5 5.5 0 0 0 0-11zM8 5v3.2l2.2 1.3',
 personeel: 'M8 8a2.8 2.8 0 1 0 0-5.6A2.8 2.8 0 0 0 8 8zM2.5 14c.6-2.6 2.8-4 5.5-4s4.900 1.400 5.5 4',
 afwezigheid: 'M2 3.500h12v10.500H2zM2 6.500h12M6 9l4 3M10 9l-4 3',
 materiaal: 'M8 1.800l5.500 3v6.400L8 14.200l-5.500-3V4.800zM2.500 4.800L8 7.800l5.500-3M8 7.800v6.400',
 inventaris: 'M2 4h12v3H2zM3 7v6.500h10V7M6.500 9.500h3',
 support: 'M8 2.500a5.500 5.500 0 1 0 0 11a5.500 5.500 0 0 0 0-11zM6.300 6.300a1.800 1.800 0 1 1 2.500 1.700c-.500.200-.800.600-.800 1.100M8 11.300v.2',
 procedures: 'M3 2h10v12H3zM5.500 5h5M5.500 7.500h5M5.500 10h3',
 backup: 'M8 2v7.500M5 6.800L8 9.800l3-3M2.500 11v2.500h11V11',
 hulp: 'M2.500 3h11v8h-6L4.500 13.500V11h-2z',
 uit: 'M6.500 2.500h-4v11h4M10 5l3 3-3 3M13 8H6',
 mensen: 'M6 7.500a2.300 2.300 0 1 0 0-4.600a2.300 2.300 0 0 0 0 4.600zM1.500 13c.400-2.200 2.200-3.400 4.500-3.400s4.100 1.200 4.500 3.400M11 3.200a2.300 2.300 0 0 1 0 4.200M12.300 9.900c1.200.500 2 1.600 2.200 3.100',
 acties: 'M9 1.500L3.500 9H8l-1 5.500L12.500 7H8z',
 zon: 'M8 5.2a2.800 2.800 0 1 0 0 5.600a2.800 2.800 0 0 0 0-5.600zM8 1.500v1.500M8 13v1.500M1.500 8h1.500M13 8h1.500M3.400 3.400l1.100 1.100M11.500 11.500l1.100 1.100M3.400 12.600l1.100-1.100M11.500 4.500l1.100-1.100',
 maan: 'M13.500 9.500A5.800 5.800 0 0 1 6.500 2.500a5.800 5.800 0 1 0 7 7z',
 trend: 'M2 12.500h3v-3h3v-3h3v-3h3',
 pijl: 'M3 8h10M9.500 4.500L13 8l-3.500 3.500',
};

export default function Icon({ name, size = 16 }) {
 return <svg className="icon" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
  strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={PATHS[name] || PATHS.dashboard} /></svg>;
}
