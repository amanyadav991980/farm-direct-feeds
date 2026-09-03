// Real produce photography for the marketplace catalogue.
//
// Every crop name below maps to a real photo hosted on Wikimedia Commons
// (960px thumbnails, hotlink-friendly). CropArt consults this map when a
// listing has no uploaded image of its own — a farmer-supplied imageUrl
// always wins. If a photo fails to load the component falls back to the
// decorative emoji plate, so tiles never break.

const W = (path: string) =>
  `https://thumb.wikimedia.org/wikipedia/commons/thumb/${path}`;
const ORIG = (path: string) => `https://upload.wikimedia.org/wikipedia/commons/${path}`;
const FILE = (name: string) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/File:${encodeURIComponent(name)}?width=960`;

export const CROP_IMAGE_URLS: Record<string, string> = {
  // ───────────────────────────── Vegetables ─────────────────────────────
  Tomato: W("8/89/Tomato_je.jpg/960px-Tomato_je.jpg"),
  Potato: W("a/ab/Patates.jpg/960px-Patates.jpg"),
  Onion: W("a/a2/Mixed_onions.jpg/960px-Mixed_onions.jpg"),
  Carrot: W("a/a2/Vegetable-Carrot-Bundle-wStalks.jpg/960px-Vegetable-Carrot-Bundle-wStalks.jpg"),
  Cauliflower: W("2/2f/Chou-fleur_02.jpg/960px-Chou-fleur_02.jpg"),
  Cabbage: W("6/6f/Cabbage_and_cross_section_on_white.jpg/960px-Cabbage_and_cross_section_on_white.jpg"),
  "Okra (Ladyfinger)": W("9/95/Hong_Kong_Okra_Aug_25_2012.JPG/960px-Hong_Kong_Okra_Aug_25_2012.JPG"),
  "Brinjal (Eggplant)": W("7/76/Solanum_melongena_24_08_2012_%281%29.JPG/960px-Solanum_melongena_24_08_2012_%281%29.JPG"),
  "Green Chilli": W("5/50/Madame_Jeanette_and_other_chillies.jpg/960px-Madame_Jeanette_and_other_chillies.jpg"),
  "Capsicum (Bell Pepper)": W("8/85/Green-Yellow-Red-Pepper-2009.jpg/960px-Green-Yellow-Red-Pepper-2009.jpg"),
  "Green Peas": W("1/11/Peas_in_pods_-_Studio.jpg/960px-Peas_in_pods_-_Studio.jpg"),
  "Spinach (Palak)": W("c/cd/Spinach.jpg/960px-Spinach.jpg"),
  "Coriander (Dhania)": W("c/c2/Coriander_Leaves.jpg/960px-Coriander_Leaves.jpg"),
  Radish: W("0/0c/Radish_3371103037_4ab07db0bf_o.jpg/960px-Radish_3371103037_4ab07db0bf_o.jpg"),
  Beetroot: W("a/ae/Detroitdarkredbeets.png/960px-Detroitdarkredbeets.png"),
  "Bottle Gourd (Lauki)": FILE("Courge encore verte.jpg"),
  "Bitter Gourd (Karela)": W("9/9d/Taiwan_2009_Tainan_City_Organic_Farm_Bitter_Gourd_FRD_7956.jpg/960px-Taiwan_2009_Tainan_City_Organic_Farm_Bitter_Gourd_FRD_7956.jpg"),
  "Ridge Gourd (Turai)": W("d/d5/Luffa_acutangula_Chinese_okra.jpg/960px-Luffa_acutangula_Chinese_okra.jpg"),
  Pumpkin: W("5/5c/FrenchMarketPumpkinsB.jpg/960px-FrenchMarketPumpkinsB.jpg"),
  Cucumber: W("9/96/ARS_cucumber.jpg/960px-ARS_cucumber.jpg"),
  Broccoli: W("0/03/Broccoli_and_cross_section_edit.jpg/960px-Broccoli_and_cross_section_edit.jpg"),
  "French Beans": W("c/ca/Snijboon_peulen_Phaseolus_vulgaris.jpg/960px-Snijboon_peulen_Phaseolus_vulgaris.jpg"),
  "Sweet Corn": ORIG("7/79/VegCorn.jpg"),
  "Green Beans": W("a/a0/Heaps_of_beans.jpg/960px-Heaps_of_beans.jpg"),
  Garlic: W("9/9a/Garlic_bulbs_and_cloves.jpg/960px-Garlic_bulbs_and_cloves.jpg"),
  Ginger: W("d/dd/Ginger_Root_%28179871501%29.jpeg/960px-Ginger_Root_%28179871501%29.jpeg"),

  // ─────────────────────────────── Fruits ───────────────────────────────
  Mango: W("7/74/Mangos_-_single_and_halved.jpg/960px-Mangos_-_single_and_halved.jpg"),
  Banana: ORIG("d/de/Bananavarieties.jpg"),
  Apple: W("a/a6/Pink_lady_and_cross_section.jpg/960px-Pink_lady_and_cross_section.jpg"),
  Orange: W("e/e3/Oranges_-_whole-halved-segment.jpg/960px-Oranges_-_whole-halved-segment.jpg"),
  Guava: W("8/88/Guava_pink_fruit.jpg/960px-Guava_pink_fruit.jpg"),
  Papaya: W("0/09/Papaya_-_longitudinal_section.jpg/960px-Papaya_-_longitudinal_section.jpg"),
  Pomegranate: W("f/fa/Pomegranate_fruit_-_whole_and_piece_with_arils.jpg/960px-Pomegranate_fruit_-_whole_and_piece_with_arils.jpg"),
  Watermelon: W("4/47/Taiwan_2009_Tainan_City_Organic_Farm_Watermelon_FRD_7962.jpg/960px-Taiwan_2009_Tainan_City_Organic_Farm_Watermelon_FRD_7962.jpg"),
  Muskmelon: FILE("Meloen vrucht met bloem.jpg"),
  Grapes: W("5/53/Grapes%2C_Rostov-on-Don%2C_Russia.jpg/960px-Grapes%2C_Rostov-on-Don%2C_Russia.jpg"),
  Lemon: W("e/e4/P1030323.JPG/960px-P1030323.JPG"),

  // ─────────────────────────────── Grains ───────────────────────────────
  Wheat: W("a/a3/Vehn%C3%A4pelto_6.jpg/960px-Vehn%C3%A4pelto_6.jpg"),
  "Rice (Paddy Parboiled)": W("0/0f/Riso_parboiled.jpg/960px-Riso_parboiled.jpg"),
  "Paddy (Raw)": W("f/f2/Mature_Rice_%28India%29_by_Augustus_Binu.jpg/960px-Mature_Rice_%28India%29_by_Augustus_Binu.jpg"),
  Maize: W("d/d3/Corn_on_the_cob.jpg/960px-Corn_on_the_cob.jpg"),
  Barley: W("2/20/Barley_%28Hordeum_vulgare%29_-_United_States_National_Arboretum_-_24_May_2009.jpg/960px-Barley_%28Hordeum_vulgare%29_-_United_States_National_Arboretum_-_24_May_2009.jpg"),
  "Bajra (Pearl Millet)": W("f/f0/Grain_millet%2C_early_grain_fill%2C_Tifton%2C_7-3-02.jpg/960px-Grain_millet%2C_early_grain_fill%2C_Tifton%2C_7-3-02.jpg"),
  "Jowar (Sorghum)": W("8/84/Sorghum_bicolor03.jpg/960px-Sorghum_bicolor03.jpg"),
  "Ragi (Finger Millet)": W("6/6c/Finger_millet_3_11-21-02.jpg/960px-Finger_millet_3_11-21-02.jpg"),

  // ─────────────────────────────── Pulses ───────────────────────────────
  "Lentils (Masoor)": W("f/f5/3_types_of_lentil.png/960px-3_types_of_lentil.png"),
  "Chickpea (Chana)": W("8/89/Chickpea_BNC.jpg/960px-Chickpea_BNC.jpg"),
  "Green Gram (Moong)": W("8/86/Mung_beans_%28Vigna_radiata%29.jpg/960px-Mung_beans_%28Vigna_radiata%29.jpg"),
  "Black Gram (Urad)": W("6/6f/Black_gram.jpg/960px-Black_gram.jpg"),
  "Pigeon Pea (Arhar/Toor)": W("2/2f/Pigeon_peas.jpg/960px-Pigeon_peas.jpg"),

  // ────────────────────────────── Oilseeds ──────────────────────────────
  "Mustard (Rai)": W("d/d4/Black-mustard-seeds.jpg/960px-Black-mustard-seeds.jpg"),
  "Groundnut (Peanut)": W("f/fb/Peanuts_%28Arachis_hypogaea%29_-_in_shell%2C_shell_cracked_open%2C_shelled%2C_peeled.jpg/960px-Peanuts_%28Arachis_hypogaea%29_-_in_shell%2C_shell_cracked_open%2C_shelled%2C_peeled.jpg"),
  Soybean: ORIG("8/82/Soybean.USDA.jpg"),
  "Sesame (Til)": W("6/69/Sa_white_sesame_seeds.jpg/960px-Sa_white_sesame_seeds.jpg"),
  Sunflower: W("3/39/Sunflower_Seeds_Kaldari.jpg/960px-Sunflower_Seeds_Kaldari.jpg"),

  // ─────────────────────────────── Other ────────────────────────────────
  Turmeric: W("a/ac/Turmeric_Roots_Madagascar.jpg/960px-Turmeric_Roots_Madagascar.jpg"),
  "Coriander Seeds": W("2/29/Coriander_seeds.jpg/960px-Coriander_seeds.jpg"),
  "Red Chilli (Dry)": W("5/5a/Red_chillies_koppa_2014-04-24_16-15.jpg/960px-Red_chillies_koppa_2014-04-24_16-15.jpg"),
  Sugarcane: FILE("Saccharum officinarum, Mozambique.jpg"),
  "Cotton (Kapas)": W("6/68/CottonPlant.JPG/960px-CottonPlant.JPG"),
};

/** Best available photo for a crop name ('' when none is mapped). */
export function cropImage(name?: string | null): string {
  if (!name) return "";
  return CROP_IMAGE_URLS[name] ?? "";
}
