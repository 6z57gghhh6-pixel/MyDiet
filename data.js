'use strict';
/* Dati estratti dal PDF «Piano alimentare personalizzato» – Dott. Colla Federico.
   Nessun alimento, grammatura o equivalenza è stato inventato. */
const MEALS = [
  { id: 'colazione',    nome: 'Colazione' },
  { id: 'mezzamattina', nome: 'Metà mattina' },
  { id: 'pranzo',       nome: 'Pranzo' },
  { id: 'merenda',      nome: 'Merenda' },
  { id: 'cena',         nome: 'Cena' },
  { id: 'sera',         nome: 'Spuntino serale' }
];
const GIORNI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const GIORNI_BREVI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const CATS = ['Primi', 'Secondi', 'Contorni', 'Frutta', 'Altri alimenti'];
const ORARI_DEFAULT = { colazione: '07:00', mezzamattina: '10:00', pranzo: '12:30', merenda: '16:30', cena: '19:30', sera: '21:30' };

/* u: unità di misura del piano ('g' o 'pz'); w: quantità settimanale (lista della spesa del PDF);
   pz: equivalenza "1 pezzo = X g" scritta nel PDF (n°1, 1 tazza, 1 pacchetto, 4 cucchiaini = 20 g). */
const FOODS = [
  // Primi
  { id: 'ceci', n: 'Ceci secchi', c: 0, u: 'g', w: 80, nota: 'Se freschi: 160 g (equivalenza indicata dal nutrizionista).' },
  { id: 'fagioli', n: 'Fagioli secchi', c: 0, u: 'g', w: 80, nota: 'Se freschi: 160 g (equivalenza indicata dal nutrizionista).' },
  { id: 'gnocchi', n: 'Gnocchi di patate', c: 0, u: 'g', w: 240 },
  { id: 'pasta', n: 'Pasta di semola', c: 0, u: 'g', w: 600 },
  { id: 'polenta', n: 'Polenta', c: 0, u: 'g', w: 120 },
  { id: 'riso', n: 'Riso', c: 0, u: 'g', w: 260 },
  // Secondi
  { id: 'bresaola', n: 'Bresaola', c: 1, u: 'g', w: 60 },
  { id: 'fiocchi', n: 'Fiocchi di formaggio magro', c: 1, u: 'g', w: 150 },
  { id: 'merluzzo', n: 'Merluzzo o Nasello', c: 1, u: 'g', w: 200, nota: 'Merluzzo o nasello: alternativi, come indicato dal nutrizionista.' },
  { id: 'mozzarella', n: 'Mozzarella', c: 1, u: 'g', w: 120 },
  { id: 'parmigiano', n: 'Parmigiano', c: 1, u: 'g', w: 85 },
  { id: 'persico', n: 'Persico', c: 1, u: 'g', w: 200 },
  { id: 'salmone', n: 'Salmone affumicato', c: 1, u: 'g', w: 100 },
  { id: 'uova', n: 'Uovo di gallina', c: 1, u: 'pz', w: 4, nota: 'Alla coque, in camicia o al padellino (come da piano).' },
  { id: 'vitello', n: 'Vitello magro', c: 1, u: 'g', w: 190 },
  // Contorni
  { id: 'broccoletti', n: 'Broccoletti', c: 2, u: 'g', w: 200 },
  { id: 'carote', n: 'Carote', c: 2, u: 'g', w: 400 },
  { id: 'cavolfiori', n: 'Cavolfiori', c: 2, u: 'g', w: 400 },
  { id: 'cavolini', n: 'Cavolini di Bruxelles', c: 2, u: 'g', w: 200 },
  { id: 'insalata', n: 'Insalata mista', c: 2, u: 'g', w: 200 },
  { id: 'misto', n: 'Misto di verdure cotte', c: 2, u: 'g', w: 460 },
  { id: 'spinaci', n: 'Spinaci', c: 2, u: 'g', w: 200 },
  { id: 'verza', n: 'Verza', c: 2, u: 'g', w: 400 },
  { id: 'zucca', n: 'Zucca', c: 2, u: 'g', w: 200 },
  { id: 'zucchine', n: 'Zucchine', c: 2, u: 'g', w: 400 },
  // Frutta
  { id: 'arance', n: 'Arance', c: 3, u: 'g', w: 300, pz: { g: 150, l: 'pz' } },
  { id: 'banane', n: 'Banane', c: 3, u: 'g', w: 400, pz: { g: 80, l: 'pz' } },
  { id: 'kiwi', n: 'Kiwi', c: 3, u: 'g', w: 320, pz: { g: 80, l: 'pz' } },
  { id: 'mandarini', n: 'Mandarini', c: 3, u: 'g', w: 250 },
  { id: 'mandorle', n: 'Mandorle', c: 3, u: 'g', w: 30 },
  { id: 'mele', n: 'Mele', c: 3, u: 'g', w: 900, pz: { g: 150, l: 'pz' } },
  { id: 'pere', n: 'Pere', c: 3, u: 'g', w: 360, pz: { g: 180, l: 'pz' } },
  // Altri alimenti
  { id: 'brioche', n: 'Brioche aglutinata', c: 4, u: 'pz', w: 1, nota: 'Il piano indica n° 1 = 13 g (valore da verificare).' },
  { id: 'cereali', n: 'Cereali Misura', c: 4, u: 'g', w: 80 },
  { id: 'cioccolato', n: 'Cioccolato extra fondente 75% Alce Nero', c: 4, u: 'g', w: 90 },
  { id: 'crackers', n: 'Crackers non salati', c: 4, u: 'g', w: 50, pz: { g: 25, l: 'pacchetto' } },
  { id: 'latte', n: 'Latte parzialmente scremato di vacca', c: 4, u: 'g', w: 600, pz: { g: 200, l: 'tazza' } },
  { id: 'muesli', n: 'Muesli', c: 4, u: 'g', w: 120 },
  { id: 'olio', n: 'Olio extravergine di oliva', c: 4, u: 'g', w: 260, pz: { g: 5, l: 'cucchiaino' }, nota: 'Il piano indica 4 cucchiaini = 20 g.' },
  { id: 'pane', n: 'Pane integrale', c: 4, u: 'g', w: 100 },
  { id: 'patate', n: 'Patate americana', c: 4, u: 'g', w: 350, nota: 'Come da piano: patate americane oppure patate lesse o al forno.' },
  { id: 'pesto', n: 'Pesto alla genovese', c: 4, u: 'g', w: 20 },
  { id: 'pizzetta', n: 'Pizzetta bianca', c: 4, u: 'g', w: 50, pz: { g: 50, l: 'pz' } },
  { id: 'salsa', n: 'Salsa di pomodoro', c: 4, u: 'g', w: 390 },
  { id: 'scaloppina', n: 'Scaloppina di pollo al limone', c: 4, u: 'g', w: 150 },
  { id: 'straccietti', n: 'Straccietti di pollo', c: 4, u: 'g', w: 150 },
  { id: 'yogurttb', n: 'Yogurt FAGE truebland', c: 4, u: 'g', w: 750 },
  { id: 'yogurtgreco', n: 'Yogurt greco s.l FAGE', c: 4, u: 'g', w: 450 }
];

/* Piano originale: [giorno][pasto] = { i:[[alimento, quantità, piatto?]...], l:1 se «Pasto libero» } */
const _P = (items, l) => ({ i: items.map(([f, q, d]) => (d ? { f, q, d } : { f, q })), l: l ? 1 : 0 });
const _D = (colazione, mezzamattina, pranzo, merenda, cena, sera) => ({ colazione, mezzamattina, pranzo, merenda, cena, sera });
const PIANO_ORIGINALE = [
  _D( // Lunedì
    _P([['yogurtgreco', 150], ['muesli', 40], ['banane', 80]]),
    _P([['mele', 150], ['parmigiano', 15]]),
    _P([['pasta', 100, 'Pasta con le verdure'], ['misto', 90, 'Pasta con le verdure'], ['straccietti', 150], ['carote', 200], ['kiwi', 80], ['olio', 20]]),
    _P([['yogurttb', 150]]),
    _P([['riso', 80, 'Riso con il pomodoro e legumi'], ['salsa', 60, 'Riso con il pomodoro e legumi'], ['ceci', 80, 'Riso con il pomodoro e legumi'], ['spinaci', 200], ['mele', 150], ['olio', 20]]),
    _P([['cioccolato', 15]])),
  _D( // Martedì
    _P([['latte', 200], ['cereali', 40]]),
    _P([['crackers', 25], ['parmigiano', 20]]),
    _P([['pasta', 100, 'Pasta con il pesto'], ['pesto', 20, 'Pasta con il pesto'], ['salmone', 100], ['verza', 200], ['pere', 180], ['olio', 20]]),
    _P([['banane', 80]]),
    _P([['polenta', 120, 'Polenta con pomodoro'], ['salsa', 60, 'Polenta con pomodoro'], ['vitello', 150], ['cavolfiori', 200], ['kiwi', 80], ['olio', 20]]),
    _P([['cioccolato', 15]])),
  _D( // Mercoledì
    _P([['yogurtgreco', 150], ['muesli', 40], ['banane', 80]]),
    _P([['mele', 150], ['parmigiano', 20]]),
    _P([['pasta', 100, 'Pasta con il pomodoro'], ['salsa', 70, 'Pasta con il pomodoro'], ['fiocchi', 150], ['cavolini', 200], ['arance', 150], ['olio', 20]]),
    _P([['yogurttb', 150]]),
    _P([['gnocchi', 240, 'Gnocchi con pomodoro'], ['salsa', 60, 'Gnocchi con pomodoro'], ['merluzzo', 200], ['broccoletti', 200], ['mele', 150], ['olio', 20]]),
    _P([['cioccolato', 15]])),
  _D( // Giovedì
    _P([['latte', 200], ['cereali', 40]]),
    _P([['crackers', 25], ['parmigiano', 15]]),
    _P([['riso', 80, 'Riso con le verdure e legumi'], ['misto', 80, 'Riso con le verdure e legumi'], ['fagioli', 80, 'Riso con le verdure e legumi'], ['zucchine', 200], ['mandarini', 150], ['olio', 20]]),
    _P([['banane', 80], ['mandorle', 10]]),
    _P([['pasta', 100, 'Pasta con ragù di vitello'], ['salsa', 70, 'Pasta con ragù di vitello'], ['vitello', 40, 'Pasta con ragù di vitello'], ['uova', 2], ['zucca', 200], ['pere', 180], ['olio', 20]]),
    _P([['cioccolato', 15]])),
  _D( // Venerdì
    _P([['yogurtgreco', 150], ['muesli', 40], ['banane', 80]]),
    _P([['mele', 150], ['parmigiano', 15]]),
    _P([['pasta', 100, 'Pasta con le verdure'], ['misto', 90, 'Pasta con le verdure'], ['mozzarella', 120], ['zucchine', 200], ['arance', 150], ['olio', 20]]),
    _P([['yogurttb', 150]]),
    _P([['patate', 350], ['scaloppina', 150], ['carote', 200], ['kiwi', 80], ['olio', 20]]),
    _P([['cioccolato', 15]])),
  _D( // Sabato
    _P([['latte', 200], ['brioche', 1]]),
    _P([]),
    _P([['uova', 2, 'Frittata'], ['insalata', 200], ['mele', 150], ['olio', 20], ['pane', 100]]),
    _P([['yogurttb', 150], ['mandorle', 10]]),
    _P([], true),
    _P([])),
  _D( // Domenica
    _P([['pizzetta', 50]]),
    _P([]),
    _P([['pasta', 100, 'Pasta con il pomodoro'], ['salsa', 70, 'Pasta con il pomodoro'], ['bresaola', 60], ['cavolfiori', 200], ['mandarini', 100], ['olio', 20]]),
    _P([['yogurttb', 150], ['mandorle', 10]]),
    _P([['riso', 100, 'Minestrone con riso'], ['misto', 200, 'Minestrone con riso'], ['persico', 200], ['verza', 200], ['kiwi', 80], ['olio', 20]]),
    _P([['cioccolato', 15]]))
];

const NOTE_PDF = [
  ['Lunedì, cena', 'Le pagine giornaliere indicano «Pere n°1», la griglia «Mele g 150». Nell’app vale la griglia: solo così i totali della lista della spesa del PDF (Mele 900 g, Pere 360 g) tornano.'],
  ['Giovedì, cena', 'Nel «ragù di vitello» la pagina giornaliera riporta solo la pasta; la griglia anche salsa di pomodoro 70 g e vitello magro 40 g. Vale la griglia (i totali della spesa lo confermano).'],
  ['Misto di verdure e salsa di pomodoro', 'Nelle pagine giornaliere compare «Quantità bastante»; nella griglia sono indicati i grammi. Nell’app valgono i grammi.'],
  ['Brioche aglutinata', 'Il PDF indica n° 1 = 13 g: peso insolitamente basso, da verificare con il nutrizionista. L’app conta il pezzo.'],
  ['Intestazione', 'Il PDF è intestato a «Pietro Mazzarella».'],
  ['Pasti vuoti', 'Sabato: nessuna metà mattina né spuntino serale, cena «Pasto libero» (nessun alimento indicato). Domenica: nessuna metà mattina.']
];
