type PlotApplication={id:string;applicant:string;status:string;details:{plot?:string}};
export function plotApplications3D<T extends PlotApplication>(applications:readonly T[],plot:string|null,status='all'):T[]{
 return applications.filter(a=>(plot===null||a.details.plot===plot)&&(status==='all'||a.status===status));
}
export function selectedPlotApplication3D<T extends PlotApplication>(applications:readonly T[],selected:string):T|undefined{
 return applications.find(a=>a.id===selected)??applications.find(a=>a.status==='pending')??applications[0];
}
