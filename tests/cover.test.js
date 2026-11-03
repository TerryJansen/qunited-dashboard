import {test,expect} from '@playwright/test';
import {emptyData} from '../src/modules.js';
import {occupancy,freeFrom,isDeployed,coverWindow,staffing} from '../src/cover.js';

// Rekencontroles op de pure functies: geen browser nodig, dus ze draaien in een oogwenk.
const base=overrides=>({...emptyData(),...overrides});
const ada=[{id:'e1',name:'Ada',status:'Actief'}];

test('two assignments on one day count the person once',()=>{
 const data=base({personeel:[...ada,{id:'e2',name:'Bram',status:'Actief'}],inzet:[
  {id:'i1',status:'Actief',employeeId:'e1',projectId:'p1',start:'2026-11-01',end:'2026-11-30'},
  {id:'i2',status:'Actief',employeeId:'e1',projectId:'p2',start:'2026-11-01',end:'2026-11-30'}]});
 const result=occupancy(data,'2026-11-10');
 expect(result.deployed).toHaveLength(1);
 expect(result.available).toHaveLength(1);
 expect(result.rate).toBe(50);
});

test('a back-to-back assignment does not make someone available',()=>{
 const data=base({personeel:ada,inzet:[
  {id:'i1',status:'Actief',employeeId:'e1',projectId:'p1',start:'2026-11-01',end:'2026-11-10'},
  {id:'i2',status:'Gepland',employeeId:'e1',projectId:'p2',start:'2026-11-11',end:'2026-11-20'}]});
 expect(freeFrom(data,'e1','2026-11-05')).toBe('2026-11-21');
});

test('known absence after an assignment pushes availability further out',()=>{
 const inzet=[{id:'i1',status:'Actief',employeeId:'e1',projectId:'p1',start:'2026-11-01',end:'2026-11-20'}];
 const withLeave=base({personeel:ada,inzet,afwezigheid:[{id:'x1',status:'Vastgelegd',employeeId:'e1',start:'2026-11-21',end:'2026-11-23'}]});
 expect(freeFrom(withLeave,'e1','2026-11-05')).toBe('2026-11-24');
 const cancelled=base({personeel:ada,inzet,afwezigheid:[{id:'x1',status:'Vervallen',employeeId:'e1',start:'2026-11-21',end:'2026-11-23'}]});
 expect(freeFrom(cancelled,'e1','2026-11-05')).toBe('2026-11-21');
});

test('the last day of an assignment still counts, the day after does not',()=>{
 const data=base({personeel:ada,inzet:[{id:'i1',status:'Actief',employeeId:'e1',projectId:'p1',start:'2026-11-01',end:'2026-11-10'}]});
 expect(isDeployed(data,'e1','2026-11-10')).toBe(true);
 expect(isDeployed(data,'e1','2026-11-11')).toBe(false);
});

test('the window starts on Monday and survives the summer-time change',()=>{
 const sunday=coverWindow('2026-11-08',7,'2026-11-08');
 expect([sunday.start,sunday.days[0].label,sunday.today]).toEqual(['2026-11-02','ma 2',6]);
 const dst=coverWindow('2027-03-22',28,'2027-03-22');
 expect([dst.days.length,dst.start,dst.end]).toEqual([28,'2027-03-22','2027-04-18']);
});

test('a day outside the window has no today marker',()=>{
 expect(coverWindow('2026-12-07',7,'2026-11-03').today).toBeNull();
});

test('occupancy without active staff reports no percentage rather than zero',()=>{
 expect(occupancy(emptyData(),'2026-11-10').rate).toBeNull();
});

test('staffing counts people, not assignments, and needs a stated requirement',()=>{
 const data=base({inzet:[
  {id:'i1',status:'Actief',employeeId:'e1',projectId:'p1'},
  {id:'i2',status:'Gepland',employeeId:'e1',projectId:'p1'}]});
 expect(staffing(data,{id:'p1',needed:'3'})).toEqual({filled:1,needed:3,short:2});
 expect(staffing(data,{id:'p1',needed:''})).toEqual({filled:1,needed:null,short:null});
});
