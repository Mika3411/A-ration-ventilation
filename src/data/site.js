import { Fan, FileCheck2, Globe2, HardHat, Settings, ShieldCheck, Truck, Wrench } from "lucide-react";

export const routes = [
  { label: "Accueil", path: "/" },
  { label: "Boutique", path: "/boutique" },
  { label: "A Propos De Nous", path: "/a-propos" },
  { label: "Livraison", path: "/livraison" },
  { label: "Contact", path: "/contact" },
  { label: "Espace client", path: "/espace-client" },
];

export const pageTitles = {
  "/": "Aération Ventilation - Ventilateurs industriels",
  "/boutique": "Boutique - Aération Ventilation",
  "/a-propos": "A Propos De Nous - Aération Ventilation",
  "/livraison": "Livraison - Aération Ventilation",
  "/contact": "Contact - Aération Ventilation",
  "/espace-client": "Espace client - Aération Ventilation",
  "/admin": "Administration boutique - Aération Ventilation",
};

export const googleMapsEmbedUrl =
  "https://www.google.com/maps?q=A%C3%A9ration%20Ventilation%20France&output=embed";

export const services = [
  {
    icon: HardHat,
    title: "Conseil spécialisé",
    text: "pour le choix des équipements de ventilation et des systèmes de traitement de l'air, selon vos besoins spécifiques",
  },
  {
    icon: Wrench,
    title: "Accompagnement personnalisé",
    text: "pour concevoir une installation performante, sans dépenses superflues",
  },
  {
    icon: Fan,
    title: "Fourniture d'équipements",
    text: "conduits d'air, bouches de ventilation, systèmes de ventilation automatisés, etc.",
  },
  {
    icon: Settings,
    title: "Service après-vente complet",
    text: "incluant garantie, maintenance et réparation des équipements",
  },
];

export const categories = [
  "Accessoires",
  "Grille de ventilation plafond",
  "Moteurs électriques 220/380",
  "Pompes à eau",
  "Portes d'entrée et blindées",
  "Regulateurs",
  "Ventilateurs axiaux",
  "Ventilateurs de canaux",
  "Ventilateurs de centrifuges",
  "Ventilateurs de restaurant",
  "Ventilateurs de salle de bains",
  "Ventilateurs de toiture",
];

export const reasons = [
  {
    icon: ShieldCheck,
    title: "Gamme complète de produits certifiés",
    text: "selon les normes européennes",
  },
  {
    icon: Globe2,
    title: "Revendeur pour la France, la Belgique et la Suisse",
    text: "avec un accompagnement adapté à chaque projet",
  },
  {
    icon: FileCheck2,
    title: "Licences, permis et certifications",
    text: "conformes aux réglementations en vigueur",
  },
  {
    icon: Truck,
    title: "Livraison sous 3 à 4 semaines",
    text: "selon le produit et la destination",
  },
];

export const deliverySteps = [
  {
    title: "Validation du besoin",
    text: "nous vérifions le type de produit, le débit d'air attendu et les contraintes du site.",
  },
  {
    title: "Préparation de la commande",
    text: "les équipements sont confirmés avec les accessoires utiles pour l'installation.",
  },
  {
    title: "Livraison suivie",
    text: "la livraison est organisée sous 3 à 4 semaines selon le produit et la destination.",
  },
];
