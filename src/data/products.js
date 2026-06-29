import axialFan from "../assets/product-axial-fan.jpg";

import axialFanDraf from "../assets/product-axial-fan-draf.jpg";

import axialFanYsa from "../assets/product-axial-fan-ysa.jpg";

import axialFanKsa from "../assets/product-axial-fan-ksa.jpg";

import axialFanKta from "../assets/product-axial-fan-kta.jpg";

import ductFan from "../assets/product-duct-fan.jpg";

import ductFanYka from "../assets/product-duct-fan-yka.jpg";

import ceilingGrille from "../assets/product-ceiling-grille.jpg";

import speedController from "../assets/product-speed-controller.jpg";

import electricMotor from "../assets/product-electric-motor-11kw-cast-iron.jpg";

import electricMotor11Kw2800Aluminum from "../assets/product-electric-motor-11kw-2800-aluminum.jpg";

import electricMotor22Kw from "../assets/product-electric-motor-22kw-2800-aluminum.jpg";

import electricMotor22Kw1430CastIron from "../assets/product-electric-motor-22kw-1430-cast-iron.jpg";

import electricMotor22Kw2800CastIron from "../assets/product-electric-motor-cast-iron-22kw-2800.jpg";

import electricMotor22Kw2800CastIronCopper from "../assets/product-electric-motor-cast-iron-copper-22kw-2800.jpg";

import electricMotor3Kw1430CastIron from "../assets/product-electric-motor-3kw-1430-cast-iron.jpg";

import electricMotorThreePhase11Kw2850 from "../assets/product-electric-motor-three-phase-11kw-2850.jpg";

import electricMotorThreePhase22Kw1430CastIronCopper from "../assets/product-electric-motor-three-phase-22kw-1430-cast-iron-copper.jpg";

import electricMotorThreePhase22Kw2850CastIronCopper from "../assets/product-electric-motor-three-phase-22kw-2850-cast-iron-copper.jpg";

import electricMotorThreePhase3Kw1430CastIron from "../assets/product-electric-motor-three-phase-3kw-1430-cast-iron.jpg";

import electricMotorThreePhase3Kw2850CastIron from "../assets/product-electric-motor-three-phase-3kw-2850-cast-iron.jpg";

import electricMotorThreePhase55Kw2850AluminumCopper from "../assets/product-electric-motor-three-phase-55kw-2850-aluminum-copper.jpg";

import { categories } from "./site.js";

import { formatEuro } from "../utils/format.js";

export const productImageByKey = {
  axialFan,
  axialFanDraf,
  axialFanYsa,
  axialFanKsa,
  axialFanKta,
  ductFan,
  ductFanYka,
  ceilingGrille,
  speedController,
  electricMotor,
  electricMotor11Kw2800Aluminum,
  electricMotor22Kw,
  electricMotor22Kw1430CastIron,
  electricMotor22Kw2800CastIron,
  electricMotor22Kw2800CastIronCopper,
  electricMotor3Kw1430CastIron,
  electricMotorThreePhase11Kw2850,
  electricMotorThreePhase22Kw1430CastIronCopper,
  electricMotorThreePhase22Kw2850CastIronCopper,
  electricMotorThreePhase3Kw1430CastIron,
  electricMotorThreePhase3Kw2850CastIron,
  electricMotorThreePhase55Kw2850AluminumCopper,
};

export const productImageOptions = [
  { label: "Ventilateur axial", value: "axialFan" },
  { label: "Ventilateur axial DRAF", value: "axialFanDraf" },
  { label: "Ventilateur axial YSA", value: "axialFanYsa" },
  { label: "Ventilateur axial KSA", value: "axialFanKsa" },
  { label: "Ventilateur axial KTA", value: "axialFanKta" },
  { label: "Ventilateur de canal", value: "ductFan" },
  { label: "Ventilateur de canal YKA", value: "ductFanYka" },
  { label: "Grille plafond", value: "ceilingGrille" },
  { label: "Régulateur", value: "speedController" },
  { label: "Moteur électrique", value: "electricMotor" },
  {
    label: "Moteur électrique 1,1 kW aluminium",
    value: "electricMotor11Kw2800Aluminum",
  },
  { label: "Moteur électrique 2,2 kW", value: "electricMotor22Kw" },
  {
    label: "Moteur électrique 2,2 kW 2800 fonte",
    value: "electricMotor22Kw2800CastIron",
  },
  {
    label: "Moteur électrique 2,2 kW cuivre",
    value: "electricMotor22Kw2800CastIronCopper",
  },
  {
    label: "Moteur électrique 2,2 kW 1430",
    value: "electricMotor22Kw1430CastIron",
  },
  {
    label: "Moteur électrique 3 kW 1430 fonte",
    value: "electricMotor3Kw1430CastIron",
  },
  {
    label: "Moteur triphasé 1,1 kW 2850",
    value: "electricMotorThreePhase11Kw2850",
  },
  {
    label: "Moteur triphasé 2,2 kW 1430 cuivre",
    value: "electricMotorThreePhase22Kw1430CastIronCopper",
  },
  {
    label: "Moteur triphasé 2,2 kW 2850 cuivre",
    value: "electricMotorThreePhase22Kw2850CastIronCopper",
  },
  {
    label: "Moteur triphasé 3 kW 1430 fonte",
    value: "electricMotorThreePhase3Kw1430CastIron",
  },
  {
    label: "Moteur triphasé 3 kW 2850 fonte",
    value: "electricMotorThreePhase3Kw2850CastIron",
  },
  {
    label: "Moteur triphasé 5,5 kW 2850 cuivre",
    value: "electricMotorThreePhase55Kw2850AluminumCopper",
  },
];

const drafAxialFanOptions = [
  { model: "200", amount: 9203, price: "92,03 €", bgn: "180,00 BGN" },
  { model: "250", amount: 10226, price: "102,26 €", bgn: "200,00 BGN" },
  { model: "300", amount: 11248, price: "112,48 €", bgn: "220,00 BGN" },
  { model: "350", amount: 12782, price: "127,82 €", bgn: "250,00 BGN" },
];

const drafAxialFanProduct = {
  name: "Ventilateur axial DRAF",
  slug: "ventilateur-axial-draf",
  category: "Ventilateurs axiaux",
  imageKey: "axialFanDraf",
  imageUrl: "",
  amount: 9203,
  price: "92,03 €",
  text: "Ventilateur axial DRAF pour extraction et brassage d'air. Construction compacte avec grille métallique de protection et hélice axiale. Choisissez le diamètre adapté dans les options.",
  options: drafAxialFanOptions.map(({ model, amount, price, bgn }) => ({
    label: model,
    value: model.toLowerCase(),
    slug: `ventilateur-axial-draf-${model.toLowerCase()}`,
    amount,
    price,
    bgn,
  })),
  featured: true,
  active: true,
  sortOrder: 11,
};

const ysaAxialFanOptions = [
  { model: "250-2M", amount: 11760, price: "117,60 €", bgn: "230,00 BGN" },
  { model: "250-2T", amount: 11760, price: "117,60 €", bgn: "230,00 BGN" },
  { model: "250-4M", amount: 11760, price: "117,60 €", bgn: "230,00 BGN" },
  { model: "250-4T", amount: 11760, price: "117,60 €", bgn: "230,00 BGN" },
  { model: "300-2M", amount: 12782, price: "127,82 €", bgn: "250,00 BGN" },
  { model: "300-2T", amount: 12782, price: "127,82 €", bgn: "250,00 BGN" },
  { model: "300-4M", amount: 12782, price: "127,82 €", bgn: "250,00 BGN" },
  { model: "300-4T", amount: 12782, price: "127,82 €", bgn: "250,00 BGN" },
  { model: "350-M", amount: 13805, price: "138,05 €", bgn: "270,00 BGN" },
  { model: "350-T", amount: 13805, price: "138,05 €", bgn: "270,00 BGN" },
  { model: "400-M", amount: 14827, price: "148,27 €", bgn: "290,00 BGN" },
  { model: "400-T", amount: 14827, price: "148,27 €", bgn: "290,00 BGN" },
  { model: "450-M", amount: 16873, price: "168,73 €", bgn: "330,00 BGN" },
  { model: "450-T", amount: 16873, price: "168,73 €", bgn: "330,00 BGN" },
  { model: "500-M", amount: 18407, price: "184,07 €", bgn: "360,00 BGN" },
  { model: "500-T", amount: 18407, price: "184,07 €", bgn: "360,00 BGN" },
  { model: "550-M", amount: 19429, price: "194,29 €", bgn: "380,00 BGN" },
  { model: "550-T", amount: 19429, price: "194,29 €", bgn: "380,00 BGN" },
  { model: "600-M", amount: 21474, price: "214,74 €", bgn: "420,00 BGN" },
  { model: "600-T", amount: 21474, price: "214,74 €", bgn: "420,00 BGN" },
];

const ysaAxialFanProduct = {
  name: "Ventilateur axial YSA",
  slug: "ventilateur-axial-ysa",
  category: "Ventilateurs axiaux",
  imageKey: "axialFanYsa",
  imageUrl: "",
  amount: 11760,
  price: "117,60 €",
  text: "Ventilateur axial YSA pour extraction et brassage d'air. Corps bleu avec hélice rouge et grille métallique de protection. Choisissez le modèle adapté dans les options.",
  options: ysaAxialFanOptions.map(({ model, amount, price, bgn }) => ({
    label: model,
    value: model.toLowerCase(),
    slug: `ventilateur-axial-ysa-${model.toLowerCase()}`,
    amount,
    price,
    bgn,
  })),
  featured: true,
  active: true,
  sortOrder: 12,
};

const ksaAxialFanOptions = [
  { model: "250-2M", amount: 14316, price: "143,16 €", bgn: "280,00 BGN" },
  { model: "250-2T", amount: 14316, price: "143,16 €", bgn: "280,00 BGN" },
  { model: "250-4M", amount: 14316, price: "143,16 €", bgn: "280,00 BGN" },
  { model: "250-4T", amount: 14316, price: "143,16 €", bgn: "280,00 BGN" },
  { model: "300-2M", amount: 14827, price: "148,27 €", bgn: "290,00 BGN" },
  { model: "300-2T", amount: 14827, price: "148,27 €", bgn: "290,00 BGN" },
  { model: "300-4M", amount: 14827, price: "148,27 €", bgn: "290,00 BGN" },
  { model: "300-4T", amount: 14827, price: "148,27 €", bgn: "290,00 BGN" },
  { model: "350-M", amount: 16361, price: "163,61 €", bgn: "320,00 BGN" },
  { model: "350-T", amount: 16361, price: "163,61 €", bgn: "320,00 BGN" },
  { model: "400-M", amount: 17895, price: "178,95 €", bgn: "350,00 BGN" },
  { model: "400-T", amount: 17895, price: "178,95 €", bgn: "350,00 BGN" },
  { model: "450-M", amount: 18918, price: "189,18 €", bgn: "370,00 BGN" },
  { model: "450-T", amount: 18918, price: "189,18 €", bgn: "370,00 BGN" },
  { model: "500-M", amount: 20963, price: "209,63 €", bgn: "410,00 BGN" },
  { model: "500-T", amount: 20963, price: "209,63 €", bgn: "410,00 BGN" },
  { model: "550-M", amount: 21474, price: "214,74 €", bgn: "420,00 BGN" },
  { model: "550-T", amount: 21474, price: "214,74 €", bgn: "420,00 BGN" },
  { model: "600-M", amount: 23008, price: "230,08 €", bgn: "450,00 BGN" },
  { model: "600-T", amount: 23008, price: "230,08 €", bgn: "450,00 BGN" },
];

const ksaAxialFanProduct = {
  name: "Ventilateur axial KSA",
  slug: "ventilateur-axial-ksa",
  category: "Ventilateurs axiaux",
  imageKey: "axialFanKsa",
  imageUrl: "",
  amount: 14316,
  price: "143,16 €",
  text: "Ventilateur axial KSA pour montage mural et extraction d'air. Cadre carré bleu avec hélice rouge et grille métallique de protection. Choisissez le modèle adapté dans les options.",
  options: ksaAxialFanOptions.map(({ model, amount, price, bgn }) => ({
    label: model,
    value: model.toLowerCase(),
    slug: `ventilateur-axial-ksa-${model.toLowerCase()}`,
    amount,
    price,
    bgn,
  })),
  featured: true,
  active: true,
  sortOrder: 13,
};

const ktaAxialFanOptions = [
  { model: "160", amount: 4602, price: "46,02 €", bgn: "90,00 BGN" },
  { model: "200", amount: 5113, price: "51,13 €", bgn: "100,00 BGN" },
  { model: "250", amount: 5624, price: "56,24 €", bgn: "110,00 BGN" },
];

const ktaAxialFanProduct = {
  name: "Ventilateur axial KTA",
  slug: "ventilateur-axial-kta",
  category: "Ventilateurs axiaux",
  imageKey: "axialFanKta",
  imageUrl: "",
  amount: 4602,
  price: "46,02 €",
  text: "Ventilateur axial KTA pour extraction d'air. Corps rond blanc avec hélice rouge et raccord arrière noir. Choisissez le diamètre adapté dans les options.",
  options: ktaAxialFanOptions.map(({ model, amount, price, bgn }) => ({
    label: model,
    value: model.toLowerCase(),
    slug: `ventilateur-axial-kta-${model.toLowerCase()}`,
    amount,
    price,
    bgn,
  })),
  featured: true,
  active: true,
  sortOrder: 14,
};

const ykaDuctFanOptions = [
  { model: "100-A", amount: 7669, price: "76,69 €", bgn: "150,00 BGN" },
  { model: "100-B", amount: 7669, price: "76,69 €", bgn: "150,00 BGN" },
  { model: "125-A", amount: 8181, price: "81,81 €", bgn: "160,00 BGN" },
  { model: "125-B", amount: 8181, price: "81,81 €", bgn: "160,00 BGN" },
  { model: "150-A", amount: 8181, price: "81,81 €", bgn: "160,00 BGN" },
  { model: "150-B", amount: 8436, price: "84,36 €", bgn: "165,00 BGN" },
  { model: "160-A", amount: 8692, price: "86,92 €", bgn: "170,00 BGN" },
  { model: "160-B", amount: 8948, price: "89,48 €", bgn: "175,00 BGN" },
  { model: "200-A", amount: 10993, price: "109,93 €", bgn: "215,00 BGN" },
  { model: "200-B", amount: 11504, price: "115,04 €", bgn: "225,00 BGN" },
  { model: "250-A", amount: 13038, price: "130,38 €", bgn: "255,00 BGN" },
  { model: "250-B", amount: 13549, price: "135,49 €", bgn: "265,00 BGN" },
  { model: "315-A", amount: 15594, price: "155,94 €", bgn: "305,00 BGN" },
  { model: "315-B", amount: 16106, price: "161,06 €", bgn: "315,00 BGN" },
];

const ykaDuctFanProduct = {
  name: "Ventilateur de canal YKA",
  slug: "ventilateur-de-canal-yka",
  category: "Ventilateurs de canaux",
  imageKey: "ductFanYka",
  imageUrl: "",
  amount: 7669,
  price: "76,69 €",
  text: "Ventilateur de canal YKA pour réseaux de ventilation. Corps métallique compact avec turbine centrifuge et boîtier de raccordement. Choisissez le modèle adapté dans les options.",
  options: ykaDuctFanOptions.map(({ model, amount, price, bgn }) => ({
    label: model,
    value: model.toLowerCase(),
    slug: `ventilateur-de-canal-yka-${model.toLowerCase()}`,
    amount,
    price,
    bgn,
  })),
  featured: true,
  active: true,
  sortOrder: 21,
};

export const defaultProducts = [
  {
    name: "Ventilateurs axiaux",
    slug: "ventilateurs-axiaux",
    category: "Ventilation industrielle",
    imageKey: "axialFan",
    imageUrl: "",
    amount: 24900,
    price: "249 €",
    text: "Ventilateurs haute performance pour le renouvellement d'air et l'extraction.",
    featured: true,
    active: true,
    sortOrder: 10,
  },
  drafAxialFanProduct,
  ysaAxialFanProduct,
  ksaAxialFanProduct,
  ktaAxialFanProduct,
  {
    name: "Ventilateurs de canaux",
    slug: "ventilateurs-de-canaux",
    category: "Réseaux de conduits",
    imageKey: "ductFan",
    imageUrl: "",
    amount: 18900,
    price: "189 €",
    text: "Solutions compactes pour installations dans les conduits.",
    featured: true,
    active: true,
    sortOrder: 20,
  },
  ykaDuctFanProduct,
  {
    name: "Moteur électrique monophasé 1,1 kW 2800 tr/min",
    slug: "moteur-electrique-monophase-11-kw-2800-tr-min",
    category: "Moteurs électriques 220/380",
    imageKey: "electricMotor11Kw2800Aluminum",
    imageUrl: "",
    amount: 9500,
    price: "95 €",
    text: "Moteur électrique monophasé VOSTOK MOTORS 1,1 kW / 2800 tr/min, alimentation 230 V ±5 % et fréquence 50 Hz. Boîtier en aluminium, deux condensateurs, résistance en aluminium, rondelle à double canal, prise et câble inclus. Poids 11 kg.",
    featured: true,
    active: true,
    sortOrder: 50,
  },
  {
    name: "Moteur électrique monophasé 1,1 kW 2800 tr/min carter en fonte",
    slug: "moteur-electrique-monophase-11-kw-2800-tr-min-carter-en-fonte",
    category: "Moteurs électriques 220/380",
    imageKey: "electricMotor",
    imageUrl: "",
    amount: 8500,
    price: "85 €",
    text: "Moteur électrique monophasé VOSTOK MOTORS 1,1 kW / 2800 tr/min, alimentation 230 V ±5 % et fréquence 50 Hz. Carter en fonte, deux condensateurs, résistance en aluminium, rondelle à double canal, prise et câble inclus. Poids 15 kg.",
    featured: true,
    active: true,
    sortOrder: 51,
  },
  {
    name: "Moteur électrique monophasé 2,2 kW 2800 tr/min",
    slug: "moteur-electrique-monophase-22-kw-2800-tr-min",
    category: "Moteurs électriques 220/380",
    imageKey: "electricMotor22Kw",
    imageUrl: "",
    amount: 11500,
    price: "115 €",
    text: "Moteur électrique monophasé VOSTOK MOTORS 2,2 kW / 2800 tr/min, alimentation 230 V ±5 % et fréquence 50 Hz. Boîtier en aluminium, deux condensateurs, résistance en aluminium, rondelle à double canal, câble et prise inclus. Poids 18 kg.",
    featured: true,
    active: true,
    sortOrder: 52,
  },
  {
    name: "Moteur électrique monophasé 2,2 kW 2800 tr/min carter en fonte",
    slug: "moteur-electrique-monophase-22-kw-2800-tr-min-carter-en-fonte",
    category: "Moteurs électriques 220/380",
    imageKey: "electricMotor22Kw2800CastIron",
    imageUrl: "",
    amount: 11500,
    price: "115 €",
    text: "Moteur électrique monophasé VOSTOK MOTORS 2,2 kW / 2800 tr/min, alimentation 230 V ±5 % et fréquence 50 Hz. Étui en fonte, deux condensateurs, résistance en aluminium, rondelle à double canal, prise et câble inclus. Poids 23 kg.",
    featured: true,
    active: true,
    sortOrder: 53,
  },
  {
    name: "Moteur électrique monophasé 2,2 kW 2800 tr/min carter en fonte enroulement cuivre",
    slug: "moteur-electrique-monophase-22-kw-2800-tr-min-carter-en-fonte-enroulement-cuivre",
    category: "Moteurs électriques 220/380",
    imageKey: "electricMotor22Kw2800CastIronCopper",
    imageUrl: "",
    amount: 14500,
    price: "145 €",
    text: "Moteur électrique monophasé VOSTOK MOTORS 2,2 kW / 2800 tr/min, alimentation 230 V ±5 % et fréquence 50 Hz. Étui en fonte, deux condensateurs, enroulement en cuivre, rondelle à double canal, prise et câble inclus. Poids 24 kg.",
    featured: true,
    active: true,
    sortOrder: 54,
  },
  {
    name: "Moteur électrique monophasé 2,2 kW 1430 tr/min carter en fonte",
    slug: "moteur-electrique-monophase-22-kw-1430-tr-min-carter-en-fonte",
    category: "Moteurs électriques 220/380",
    imageKey: "electricMotor22Kw1430CastIron",
    imageUrl: "",
    amount: 11500,
    price: "115 €",
    text: "Moteur électrique monophasé VOSTOK MOTORS 2,2 kW / 1430 tr/min, alimentation 230 V ±5 % et fréquence 50 Hz. Étui en fonte, deux condensateurs, résistance en aluminium, rondelle à double canal, prise et câble inclus. Poids 30 kg.",
    featured: true,
    active: true,
    sortOrder: 55,
  },
  {
    name: "Moteur électrique monophasé 3 kW 1430 tr/min en fonte",
    slug: "moteur-electrique-monophase-3-kw-1430-tr-min-en-fonte",
    category: "Moteurs électriques 220/380",
    imageKey: "electricMotor3Kw1430CastIron",
    imageUrl: "",
    amount: 14900,
    price: "149 €",
    text: "Moteur électrique monophasé VOSTOK MOTORS 3 kW / 1430 tr/min, alimentation 230 V ±5 % et fréquence 50 Hz. Étui en fonte, deux condensateurs, résistance en aluminium, rondelle à double canal, prise et câble inclus. Poids 30 kg.",
    featured: true,
    active: true,
    sortOrder: 56,
  },
  {
    name: "Moteur électrique triphasé 1,1 kW 2850 tr/min",
    slug: "moteur-electrique-triphase-11-kw-2850-tr-min",
    category: "Moteurs électriques triphasés",
    imageKey: "electricMotorThreePhase11Kw2850",
    imageUrl: "",
    amount: 9500,
    price: "95 €",
    text: "Moteur électrique triphasé VOSTOK MOTORS 1,1 kW / 2850 tr/min, alimentation 380 V et fréquence 50 Hz. Boîtier en aluminium, résistance en aluminium et rondelle à double canal incluse. Poids 11 kg.",
    featured: true,
    active: true,
    sortOrder: 57,
  },
  {
    name: "Moteur électrique triphasé 2,2 kW 1430 tr/min",
    slug: "moteur-electrique-triphase-22-kw-1430-tr-min",
    category: "Moteurs électriques triphasés",
    imageKey: "electricMotorThreePhase22Kw1430CastIronCopper",
    imageUrl: "",
    amount: 13900,
    price: "139 €",
    text: "Moteur électrique triphasé VOSTOK MOTORS 2,2 kW / 1430 tr/min, alimentation 380 V et fréquence 50 Hz. Étui en fonte, enroulement 100 % cuivre et rondelle à double canal incluse. Poids 23 kg.",
    featured: true,
    active: true,
    sortOrder: 58,
  },
  {
    name: "Moteur électrique triphasé 3 kW 1430 tr/min",
    slug: "moteur-electrique-triphase-3-kw-1430-tr-min",
    category: "Moteurs électriques triphasés",
    imageKey: "electricMotorThreePhase3Kw1430CastIron",
    imageUrl: "",
    amount: 14900,
    price: "149 €",
    text: "Moteur électrique triphasé VOSTOK 3 kW / 1430 tr/min, alimentation 380 V et fréquence 50 Hz. Étui en fonte, résistance en aluminium et rondelle à double canal incluse. Poids 30 kg.",
    featured: true,
    active: true,
    sortOrder: 59,
  },
  {
    name: "Moteur électrique triphasé 2,2 kW 2850 tr/min",
    slug: "moteur-electrique-triphase-22-kw-2850-tr-min",
    category: "Moteurs électriques triphasés",
    imageKey: "electricMotorThreePhase22Kw2850CastIronCopper",
    imageUrl: "",
    amount: 13900,
    price: "139 €",
    text: "Moteur électrique triphasé VOSTOK 2,2 kW / 2850 tr/min, alimentation 380 V et fréquence 50 Hz. Étui en fonte, enroulement 100 % cuivre et rondelle à double canal incluse. Poids 23 kg.",
    featured: true,
    active: true,
    sortOrder: 60,
  },
  {
    name: "Moteur électrique triphasé 3 kW 2850 tr/min",
    slug: "moteur-electrique-triphase-3-kw-2850-tr-min",
    category: "Moteurs électriques triphasés",
    imageKey: "electricMotorThreePhase3Kw2850CastIron",
    imageUrl: "",
    amount: 14900,
    price: "149 €",
    text: "Moteur électrique triphasé VOSTOK 3 kW / 2850 tr/min, alimentation 380 V et fréquence 50 Hz. Étui en fonte, résistance en aluminium et rondelle à double canal incluse. Poids 30 kg.",
    featured: true,
    active: true,
    sortOrder: 61,
  },
  {
    name: "Moteur électrique triphasé 5,5 kW 2850 tr/min",
    slug: "moteur-electrique-triphase-55-kw-2850-tr-min",
    category: "Moteurs électriques triphasés",
    imageKey: "electricMotorThreePhase55Kw2850AluminumCopper",
    imageUrl: "",
    amount: 32500,
    price: "325 €",
    text: "Moteur électrique triphasé VOSTOK 5,5 kW / 2850 tr/min, alimentation 380 V et fréquence 50 Hz. Boîtier en aluminium, enroulement 100 % cuivre et rondelle à double canal incluse. Poids 47 kg.",
    featured: true,
    active: true,
    sortOrder: 62,
  },
  {
    name: "Grilles de ventilation plafond",
    slug: "grilles-de-ventilation-plafond",
    category: "Diffusion d'air",
    imageKey: "ceilingGrille",
    imageUrl: "",
    amount: 7900,
    price: "79 €",
    text: "Diffusion d'air efficace pour bureaux, commerces et bâtiments industriels.",
    featured: false,
    active: true,
    sortOrder: 70,
  },
  {
    name: "Régulateurs",
    slug: "regulateurs",
    category: "Pilotage",
    imageKey: "speedController",
    imageUrl: "",
    amount: 12900,
    price: "129 €",
    text: "Régulation de vitesse et contrôle pour optimiser vos installations.",
    featured: true,
    active: true,
    sortOrder: 80,
  },
].map(normalizeProduct);

export function resolveProductImage(product) {
  return product.imageData || product.imageUrl || productImageByKey[product.imageKey] || ductFan;
}

export function normalizeProduct(product) {
  const options = normalizeProductOptions(product);
  const optionAmounts = options.map((option) => option.amount);
  const fallbackAmount = optionAmounts.length ? Math.min(...optionAmounts) : 0;
  const amount = Number.parseInt(product.amount, 10);
  const normalizedAmount = Number.isInteger(amount) ? amount : fallbackAmount;

  return {
    ...product,
    amount: normalizedAmount,
    price: product.price || formatEuro(normalizedAmount),
    text: product.text || product.description || "",
    description: product.description || product.text || "",
    options,
    imageKey: product.imageKey || "ductFan",
    imageUrl: product.imageUrl || "",
    imageData: product.imageData || "",
    image: resolveProductImage(product),
    featured: product.featured === true,
    active: product.active !== false,
    sortOrder: Number.parseInt(product.sortOrder, 10) || 0,
  };
}

function normalizeProductOptions(product) {
  if (!Array.isArray(product.options)) return [];

  return product.options
    .map((option, index) => normalizeProductOption(option, product.slug, index))
    .filter(Boolean);
}

function normalizeProductOption(option, productSlug, index) {
  const amount = Number.parseInt(option?.amount, 10);
  const label = String(option?.label || option?.name || "").trim();
  const slug = String(option?.slug || `${productSlug}-option-${index + 1}`).trim();

  if (!label || !slug || !Number.isInteger(amount) || amount < 0) return null;

  return {
    label,
    value: String(option?.value || slug).trim(),
    slug,
    amount,
    price: option?.price || formatEuro(amount),
    bgn: String(option?.bgn || "").trim(),
    description: String(option?.description || "").trim(),
  };
}

export function normalizeProducts(productsToNormalize) {
  if (!Array.isArray(productsToNormalize)) return defaultProducts;
  return productsToNormalize.map(normalizeProduct).filter((product) => product.slug && product.name);
}

export function normalizeCategories(categoriesToNormalize, products = defaultProducts) {
  const sourceCategories = Array.isArray(categoriesToNormalize) ? categoriesToNormalize : categories;
  return Array.from(new Set([...sourceCategories, ...products.map((product) => product.category)]))
    .filter(Boolean)
    .sort((first, second) => first.localeCompare(second, "fr"));
}

export function getProductPath(product) {
  return `/boutique/${product.slug}`;
}

export function getProductFromPath(pathname, products) {
  const cleanPath = pathname.replace(/\/+$/, "") || "/";
  if (!cleanPath.startsWith("/boutique/")) return undefined;
  const slug = cleanPath.replace("/boutique/", "");
  return products.find((product) => product.slug === slug);
}

export function getProductCategories(products, categoryList = categories) {
  return normalizeCategories(categoryList, products);
}
