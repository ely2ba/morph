export type MachineType = 'freestanding' | 'integrated';

export type Product = {
  id: string; slug: string; brand: string; model: string; price: number; previousPrice?: number;
  type: MachineType; capacityKg: number; energyClass: string; energyKwhPer100: number;
  waterLitresPerCycle: number; noiseDb: number; noiseClass: string; spinSpeed: number;
  cycleMinutes: number; widthCm: number; heightCm: number; installedDepthCm: number;
  sideClearanceCm: number; topClearanceCm: number; rearClearanceCm: number;
  warrantyYears: number; inStock: boolean; deliveryDays: number; image: string;
  imagePosition: string; tags: string[];
};

type Seed = readonly [
  id: string, brand: string, model: string, price: number, previous: number | null,
  type: MachineType, capacity: number, energyClass: string, energy: number, water: number,
  noise: number, noiseClass: string, spin: number, cycle: number, cabinetWidth: number,
  cabinetHeight: number, cabinetDepth: number, side: number, top: number, rear: number,
  warranty: number, stock: 'in_stock' | 'out_of_stock', delivery: number,
];

const seeds: readonly Seed[] = [
  ['ald-a6','Alder','A6 1200',329,null,'freestanding',7,'D',70,54,79,'C',1200,218,59.5,84.5,57.4,.2,.2,2,2,'in_stock',2],
  ['bri-b7','Brindle','B7 1200',349,null,'freestanding',7,'D',75,58,80,'C',1200,225,59.6,84.5,58.6,.2,.2,2,2,'in_stock',1],
  ['cal-c8','Calder','C8 1400',399,429,'freestanding',8,'C',61,49,75,'B',1400,219,59.5,84.6,59.3,.2,.2,2.2,2,'in_stock',4],
  ['dov-d8','Dovell','D8 1400',459,null,'freestanding',8,'B',58,48,76,'B',1400,211,59.6,84.5,58.9,.2,.3,2,3,'in_stock',3],
  ['elm-e8','Elmridge','E8 Eco',499,549,'freestanding',8,'A',40,41,70,'A',1400,206,59.5,84.5,58.4,.2,.3,2,5,'in_stock',2],
  ['fen-f10','Fenwick','F10 Family',599,649,'freestanding',10,'A',42,42,68,'A',1400,225,59.6,84.6,59.6,.2,.2,2.1,5,'in_stock',4],
  ['gra-g10','Graye','G10 1400',549,null,'freestanding',10,'B',47,45,74,'B',1400,231,59.4,84.4,59,.2,.3,2.2,3,'in_stock',2],
  ['hux-h8i','Huxley','H8 Integrated',579,null,'integrated',8,'B',45,43,73,'B',1400,220,59.5,81.8,56,.1,.5,3,3,'in_stock',3],
  ['ion-i11','Iona','I11 Quiet',649,699,'freestanding',11,'A',40,42,67,'A',1600,238,59.7,84.6,59,.15,.2,2.9,5,'in_stock',1],
  ['jun-j6','Juno','J6 Compact',299,null,'freestanding',6,'D',74,59,81,'D',1200,228,59.5,84.5,60.3,.2,.2,2,1,'in_stock',2],
  ['ald-a8','Alder','A8 1400',379,419,'freestanding',8,'D',69,55,78,'C',1400,226,59.6,84.5,60.4,.2,.2,2.1,2,'in_stock',3],
  ['bri-b9','Brindle','B9 1400',429,null,'freestanding',9,'C',60,52,77,'C',1400,222,59.5,84.4,60.5,.2,.3,2.3,2,'in_stock',1],
  ['cal-c9','Calder','C9 Balance',479,519,'freestanding',9,'B',51,46,72,'B',1400,216,59.6,84.5,60.8,.2,.3,2.3,3,'in_stock',4],
  ['dov-d10','Dovell','D10 Silent',569,null,'freestanding',10,'A',44,44,69,'A',1400,224,59.4,84.6,61,.2,.2,2.4,5,'in_stock',2],
  ['elm-e12','Elmridge','E12 Family',699,749,'freestanding',12,'A',43,45,68,'A',1600,242,59.6,84.5,61.3,.2,.3,2.5,5,'in_stock',3],
  ['fen-f7i','Fenwick','F7 Integrated',629,null,'integrated',7,'B',48,44,70,'A',1400,221,59.5,81.8,58.3,.1,.5,6,3,'in_stock',4],
  ['gra-g9','Graye','G9 1400',519,null,'freestanding',9,'C',56,48,73,'B',1400,217,59.5,84.5,62.5,.2,.2,2.5,3,'in_stock',1],
  ['hux-h10','Huxley','H10 Silence',739,799,'freestanding',10,'A',41,41,66,'A',1600,235,59.6,84.6,62.1,.2,.2,2.6,5,'in_stock',2],
  ['ion-i12','Iona','I12 Reserve',849,null,'freestanding',12,'A',40,42,65,'A',1600,244,59.7,84.5,62.8,.15,.3,3.2,5,'in_stock',4],
  ['jun-j8','Juno','J8 1400',389,null,'freestanding',8,'C',63,51,76,'B',1400,223,59.5,84.4,61.5,.2,.3,2.2,2,'in_stock',3],
  ['ald-a7q','Alder','A7 Quick',359,null,'freestanding',7,'D',68,54,77,'C',1200,214,59.5,84.5,58.3,.2,.2,2,2,'in_stock',5],
  ['bri-b8q','Brindle','B8 Care',449,489,'freestanding',8,'C',55,47,74,'B',1400,218,59.6,84.5,58.8,.2,.3,2.2,2,'in_stock',6],
  ['cal-c10q','Calder','C10 Family',529,null,'freestanding',10,'B',49,45,72,'B',1400,229,59.4,84.6,59.1,.2,.2,2.3,3,'in_stock',7],
  ['dov-d9i','Dovell','D9 Integrated',649,699,'integrated',9,'A',43,42,69,'A',1400,226,59.5,81.8,55.7,.1,.5,3,5,'in_stock',8],
  ['elm-e11q','Elmridge','E11 Eco',729,null,'freestanding',11,'A',39,41,68,'A',1600,239,59.6,84.5,59.3,.2,.3,2.5,5,'in_stock',10],
  ['fen-f8x','Fenwick','F8 Plus',489,null,'freestanding',8,'B',52,47,73,'B',1400,220,59.5,84.5,60.8,.2,.2,2.4,3,'in_stock',6],
  ['gra-g7x','Graye','G7 Essential',319,null,'freestanding',7,'D',72,57,79,'C',1200,227,59.6,84.4,60.5,.2,.3,2.2,1,'out_of_stock',3],
  ['hux-h12x','Huxley','H12 Signature',999,1099,'freestanding',12,'A',40,40,65,'A',1600,240,59.7,84.6,58.8,.15,.2,2.7,7,'out_of_stock',7],
];

const one = (n: number) => Math.round(n * 10) / 10;

export const catalog: Product[] = seeds.map((seed, index) => {
  const [id, brand, model, price, previous, type, capacityKg, energyClass, energyKwhPer100,
    waterLitresPerCycle, noiseDb, noiseClass, spinSpeed, cycleMinutes, cabinetWidth,
    cabinetHeight, cabinetDepth, sideClearanceCm, topClearanceCm, rearClearanceCm,
    warrantyYears, stock, deliveryDays] = seed;
  return {
    id, slug: id, brand, model, price, previousPrice: previous ?? undefined, type, capacityKg,
    energyClass, energyKwhPer100, waterLitresPerCycle, noiseDb, noiseClass, spinSpeed,
    cycleMinutes, widthCm: one(cabinetWidth + sideClearanceCm * 2),
    heightCm: one(cabinetHeight + topClearanceCm), installedDepthCm: one(cabinetDepth + rearClearanceCm),
    sideClearanceCm, topClearanceCm, rearClearanceCm, warrantyYears,
    inStock: stock === 'in_stock', deliveryDays, image: '/washer.jpg',
    imagePosition: `${38 + (index % 5) * 6}% center`,
    tags: [brand.toLowerCase(), model.toLowerCase(), type, `${capacityKg}kg`, `energy-${energyClass.toLowerCase()}`],
  };
});

export const productById = new Map(catalog.map((product) => [product.id, product]));
