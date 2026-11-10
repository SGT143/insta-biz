// Product catalogue for the SGT website.
// To add a product, copy one of the objects below and edit its fields.
// All fields except `name` and `description` are optional.
const PRODUCTS = [
  {
    id: "gv-harvestiq",
    name: "GV HarvestiQ",
    tagline: "Smarter harvest planning",
    // TODO: replace with the real product description
    description:
      "Helps growers plan, track and improve every harvest, with crop data, yield records and useful insights in one app.",
    features: ["Crop & field tracking", "Yield records", "Harvest insights"],
    icon: "🌾",
    accent: "#2f9e5b",
    links: {
      website: "",   // e.g. "https://harvestiq.example.com"
      playStore: "", // e.g. "https://play.google.com/store/apps/details?id=..."
      appStore: ""   // e.g. "https://apps.apple.com/app/..."
    }
  },
  {
    id: "instabizz",
    name: "Instabizz",
    tagline: "Run your business on the go",
    // TODO: replace with the real product description
    description:
      "Lets small businesses handle day-to-day work from their phone, including customers, orders and sales, without the hassle.",
    features: ["Customer management", "Orders & sales", "Business reports"],
    icon: "⚡",
    accent: "#4f5bd5",
    links: {
      website: "",
      playStore: "",
      appStore: ""
    }
  }
];
