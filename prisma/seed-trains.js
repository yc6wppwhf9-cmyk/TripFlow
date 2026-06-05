require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ── Stations ─────────────────────────────────────────────────────────────────
// [code, name, city, state, zone, lat, lng]
const STATIONS = [
  // Delhi NCR
  ['NDLS', 'New Delhi',              'Delhi',          'Delhi',         'NR',  28.6419, 77.2197],
  ['DLI',  'Delhi Junction',         'Delhi',          'Delhi',         'NR',  28.6586, 77.2270],
  ['NZM',  'Hazrat Nizamuddin',      'Delhi',          'Delhi',         'NR',  28.5877, 77.2509],
  ['GZB',  'Ghaziabad',             'Ghaziabad',      'Uttar Pradesh', 'NR',  28.6694, 77.4538],
  // UP — Central
  ['CNB',  'Kanpur Central',         'Kanpur',         'Uttar Pradesh', 'NCR', 26.4573, 80.3509],
  ['LKO',  'Lucknow Charbagh',       'Lucknow',        'Uttar Pradesh', 'NR',  26.8467, 80.9462],
  ['ALD',  'Prayagraj Junction',     'Prayagraj',      'Uttar Pradesh', 'NCR', 25.4358, 81.8463],
  ['BSB',  'Varanasi Junction',      'Varanasi',       'Uttar Pradesh', 'NER', 25.3178, 82.9739],
  ['GKP',  'Gorakhpur Junction',     'Gorakhpur',      'Uttar Pradesh', 'NER', 26.7581, 83.3686],
  ['AGC',  'Agra Cantonment',        'Agra',           'Uttar Pradesh', 'NCR', 27.1651, 78.0001],
  ['MTJ',  'Mathura Junction',       'Mathura',        'Uttar Pradesh', 'NCR', 27.4875, 77.6658],
  ['GWL',  'Gwalior Junction',       'Gwalior',        'Madhya Pradesh','NCR', 26.2183, 78.1828],
  ['JHS',  'Jhansi Junction',        'Jhansi',         'Uttar Pradesh', 'NCR', 25.4484, 78.5685],
  // MP
  ['BPL',  'Bhopal Junction',        'Bhopal',         'Madhya Pradesh','WCR', 23.2599, 77.4126],
  ['ET',   'Itarsi Junction',        'Hoshangabad',    'Madhya Pradesh','WCR', 22.6196, 77.7700],
  ['JBP',  'Jabalpur Junction',      'Jabalpur',       'Madhya Pradesh','WCR', 23.1815, 79.9864],
  ['INDB', 'Indore Junction',        'Indore',         'Madhya Pradesh','WR',  22.7196, 75.8577],
  ['KOTA', 'Kota Junction',          'Kota',           'Rajasthan',     'WCR', 25.2138, 75.8648],
  // Bihar
  ['PNBE', 'Patna Junction',         'Patna',          'Bihar',         'ECR', 25.5941, 85.1376],
  ['PPTA', 'Patliputra Junction',    'Patna',          'Bihar',         'ECR', 25.6197, 85.0574],
  ['DNR',  'Danapur',                'Patna',          'Bihar',         'ECR', 25.6131, 85.0462],
  ['MFP',  'Muzaffarpur Junction',   'Muzaffarpur',    'Bihar',         'ECR', 26.1197, 85.3910],
  ['DBG',  'Darbhanga Junction',     'Darbhanga',      'Bihar',         'ECR', 26.1542, 85.8918],
  ['SPJ',  'Samastipur Junction',    'Samastipur',     'Bihar',         'ECR', 25.8656, 85.7781],
  ['HJP',  'Hajipur Junction',       'Hajipur',        'Bihar',         'ECR', 25.6886, 85.2094],
  ['GAYA', 'Gaya Junction',          'Gaya',           'Bihar',         'ECR', 24.7914, 85.0002],
  ['BGP',  'Bhagalpur Junction',     'Bhagalpur',      'Bihar',         'ECR', 25.2425, 87.0079],
  ['CPR',  'Chapra Junction',        'Chapra',         'Bihar',         'ECR', 25.7746, 84.7453],
  // Jharkhand
  ['DHN',  'Dhanbad Junction',       'Dhanbad',        'Jharkhand',     'ECR', 23.7957, 86.4304],
  ['RNC',  'Ranchi Junction',        'Ranchi',         'Jharkhand',     'SER', 23.3441, 85.3096],
  // West Bengal
  ['HWH',  'Howrah Junction',        'Howrah',         'West Bengal',   'ER',  22.5849, 88.3426],
  ['SDAH', 'Sealdah',               'Kolkata',        'West Bengal',   'ER',  22.5697, 88.3697],
  ['ASN',  'Asansol Junction',       'Asansol',        'West Bengal',   'ER',  23.6833, 86.9833],
  ['BWN',  'Barddhaman Junction',    'Burdwan',        'West Bengal',   'ER',  23.2324, 87.8615],
  ['KGP',  'Kharagpur Junction',     'Kharagpur',      'West Bengal',   'SER', 22.3460, 87.3196],
  // Rajasthan
  ['JP',   'Jaipur Junction',        'Jaipur',         'Rajasthan',     'NWR', 26.9124, 75.7873],
  ['AII',  'Ajmer Junction',         'Ajmer',          'Rajasthan',     'NWR', 26.4533, 74.6382],
  ['JU',   'Jodhpur Junction',       'Jodhpur',        'Rajasthan',     'NWR', 26.2389, 73.0243],
  ['UDZ',  'Udaipur City',           'Udaipur',        'Rajasthan',     'NWR', 24.5854, 73.7125],
  ['BKN',  'Bikaner Junction',       'Bikaner',        'Rajasthan',     'NWR', 28.0229, 73.3119],
  // Gujarat
  ['ADI',  'Ahmedabad Junction',     'Ahmedabad',      'Gujarat',       'WR',  23.0225, 72.5714],
  ['BRC',  'Vadodara Junction',      'Vadodara',       'Gujarat',       'WR',  22.3072, 73.1812],
  ['ST',   'Surat',                  'Surat',          'Gujarat',       'WR',  21.1702, 72.8311],
  ['GDA',  'Gandhinagar Capital',    'Gandhinagar',    'Gujarat',       'WR',  23.2156, 72.6369],
  // Maharashtra
  ['CSTM', 'Mumbai CST',             'Mumbai',         'Maharashtra',   'CR',  18.9402, 72.8353],
  ['LTT',  'Lokmanya Tilak Terminus','Mumbai',         'Maharashtra',   'CR',  19.0714, 72.9188],
  ['BCT',  'Mumbai Central',         'Mumbai',         'Maharashtra',   'WR',  18.9689, 72.8196],
  ['BDTS', 'Bandra Terminus',        'Mumbai',         'Maharashtra',   'WR',  19.0543, 72.8407],
  ['DR',   'Dadar',                  'Mumbai',         'Maharashtra',   'CR',  19.0182, 72.8455],
  ['BVI',  'Borivali',               'Mumbai',         'Maharashtra',   'WR',  19.2288, 72.8567],
  ['KYN',  'Kalyan Junction',        'Kalyan',         'Maharashtra',   'CR',  19.2437, 73.1355],
  ['IGP',  'Igatpuri',               'Nashik',         'Maharashtra',   'CR',  19.6955, 73.5594],
  ['NK',   'Nashik Road',            'Nashik',         'Maharashtra',   'CR',  19.9975, 73.7898],
  ['MMR',  'Manmad Junction',        'Nashik',         'Maharashtra',   'CR',  20.2619, 74.4397],
  ['SNSI', 'Sainagar Shirdi',        'Ahmednagar',     'Maharashtra',   'CR',  19.7698, 74.4770],
  ['PUNE', 'Pune Junction',          'Pune',           'Maharashtra',   'CR',  18.5204, 73.8567],
  ['NGP',  'Nagpur Junction',        'Nagpur',         'Maharashtra',   'CR',  21.1458, 79.0882],
  ['NED',  'Nanded',                 'Nanded',         'Maharashtra',   'SCR', 19.1383, 77.3210],
  // Telangana / AP
  ['SC',   'Secunderabad Junction',  'Hyderabad',      'Telangana',     'SCR', 17.4399, 78.4983],
  ['HYB',  'Hyderabad Deccan',       'Hyderabad',      'Telangana',     'SCR', 17.3850, 78.4867],
  ['BZA',  'Vijayawada Junction',    'Vijayawada',     'Andhra Pradesh','SCR', 16.5062, 80.6480],
  ['VSKP', 'Visakhapatnam Junction', 'Visakhapatnam',  'Andhra Pradesh','ECoR',17.6868, 83.2185],
  ['WADI', 'Wadi Junction',          'Kalaburagi',     'Karnataka',     'SCR', 17.0544, 76.9752],
  // Karnataka
  ['SBC',  'KSR Bengaluru City',     'Bangalore',      'Karnataka',     'SWR', 12.9784, 77.5718],
  ['YPR',  'Yesvantpur Junction',    'Bangalore',      'Karnataka',     'SWR', 13.0189, 77.5378],
  ['UBL',  'Hubballi Junction',      'Hubli',          'Karnataka',     'SWR', 15.3647, 75.1240],
  ['MAQ',  'Mangaluru Junction',     'Mangalore',      'Karnataka',     'SR',  12.9141, 74.8560],
  // Tamil Nadu
  ['MAS',  'Chennai Central',        'Chennai',        'Tamil Nadu',    'SR',  13.0827, 80.2707],
  ['MS',   'Chennai Egmore',         'Chennai',        'Tamil Nadu',    'SR',  13.0781, 80.2633],
  ['CBE',  'Coimbatore Junction',    'Coimbatore',     'Tamil Nadu',    'SR',  11.0168, 76.9558],
  ['MDU',  'Madurai Junction',       'Madurai',        'Tamil Nadu',    'SR',   9.9252, 78.1198],
  ['TPJ',  'Tiruchirappalli Junction','Trichy',        'Tamil Nadu',    'SR',  10.7905, 78.7047],
  // Kerala
  ['ERS',  'Ernakulam Junction',     'Kochi',          'Kerala',        'SR',   9.9312, 76.2673],
  ['TVC',  'Thiruvananthapuram Central','Trivandrum',  'Kerala',        'SR',   8.5241, 76.9366],
  // Odisha
  ['BBS',  'Bhubaneswar',           'Bhubaneswar',    'Odisha',        'ECoR',20.2961, 85.8245],
  ['PURI', 'Puri',                   'Puri',           'Odisha',        'ECoR',19.8135, 85.8312],
  // Punjab / Haryana
  ['ASR',  'Amritsar Junction',      'Amritsar',       'Punjab',        'NR',  31.6340, 74.8723],
  ['LDH',  'Ludhiana Junction',      'Ludhiana',       'Punjab',        'NR',  30.9055, 75.8561],
  ['JUC',  'Jalandhar City',         'Jalandhar',      'Punjab',        'NR',  31.3255, 75.5733],
  ['CDG',  'Chandigarh',             'Chandigarh',     'Chandigarh',    'NR',  30.7333, 76.7794],
  ['UMB',  'Ambala Cantonment',      'Ambala',         'Haryana',       'NR',  30.3782, 76.7767],
  // Uttarakhand
  ['DDN',  'Dehradun',               'Dehradun',       'Uttarakhand',   'NR',  30.3165, 78.0322],
  ['HW',   'Haridwar Junction',      'Haridwar',       'Uttarakhand',   'NR',  29.9457, 78.1664],
  // Assam
  ['GHY',  'Guwahati',              'Guwahati',       'Assam',         'NFR', 26.1445, 91.7362],
];

// ── Train data ────────────────────────────────────────────────────────────────
// Format: { no, name, type, from, to, days, classes, stops }
// stops: [ [code, arr, dep, day, km] ]  arr/dep = "HH:MM" or null
const TRAINS = [

  // ── DELHI ↔ MUMBAI ────────────────────────────────────────────────────────
  {
    no: '12951', name: 'Mumbai Rajdhani Express', type: 'RAJDHANI',
    from: 'NDLS', to: 'BCT', days: 'Except Sun', classes: ['1A', '2A', '3A'],
    stops: [
      ['NDLS', null,    '16:35', 1,    0],
      ['MTJ',  '18:37', '18:39', 1,  141],
      ['GWL',  '20:13', '20:15', 1,  304],
      ['BPL',  '23:05', '23:10', 1,  702],
      ['ET',   '00:43', '00:45', 2,  779],
      ['ST',   '06:25', '06:27', 2, 1268],
      ['BRC',  '07:25', '07:27', 2, 1312],
      ['BCT',  '08:35', null,    2, 1384],
    ],
  },
  {
    no: '12952', name: 'Mumbai Rajdhani Express', type: 'RAJDHANI',
    from: 'BCT', to: 'NDLS', days: 'Except Mon', classes: ['1A', '2A', '3A'],
    stops: [
      ['BCT',  null,    '17:40', 1,    0],
      ['BRC',  '18:43', '18:45', 1,   72],
      ['ST',   '19:41', '19:43', 1,  116],
      ['ET',   '01:10', '01:15', 2,  605],
      ['BPL',  '02:35', '02:40', 2,  682],
      ['GWL',  '06:05', '06:07', 2, 1080],
      ['MTJ',  '07:34', '07:36', 2, 1243],
      ['NDLS', '09:55', null,    2, 1384],
    ],
  },
  {
    no: '12953', name: 'August Kranti Rajdhani Express', type: 'RAJDHANI',
    from: 'NDLS', to: 'BCT', days: 'Except Sat', classes: ['1A', '2A', '3A'],
    stops: [
      ['NDLS', null,    '17:05', 1,    0],
      ['KOTA', '21:55', '22:00', 1,  459],
      ['BRC',  '06:10', '06:15', 2, 1193],
      ['ST',   '07:15', '07:17', 2, 1237],
      ['BCT',  '12:00', null,    2, 1384],
    ],
  },
  {
    no: '12954', name: 'August Kranti Rajdhani Express', type: 'RAJDHANI',
    from: 'BCT', to: 'NDLS', days: 'Except Sun', classes: ['1A', '2A', '3A'],
    stops: [
      ['BCT',  null,    '17:40', 1,    0],
      ['ST',   '18:38', '18:40', 1,   48],
      ['BRC',  '19:38', '19:40', 1,   91],
      ['KOTA', '04:40', '04:45', 2,  745],
      ['NDLS', '11:55', null,    2, 1384],
    ],
  },

  // ── DELHI ↔ BANGALORE ─────────────────────────────────────────────────────
  {
    no: '22692', name: 'Bangalore Rajdhani Express', type: 'RAJDHANI',
    from: 'NDLS', to: 'SBC', days: 'Mon,Wed,Thu,Sat', classes: ['1A', '2A', '3A'],
    stops: [
      ['NDLS', null,    '20:30', 1,    0],
      ['GWL',  '23:15', '23:17', 1,  304],
      ['JHS',  '01:03', '01:05', 2,  403],
      ['BPL',  '05:00', '05:05', 2,  702],
      ['NGP',  '09:55', '10:05', 2, 1083],
      ['WADI', '14:30', '14:32', 2, 1449],
      ['SC',   '16:05', '16:10', 2, 1549],
      ['SBC',  '18:00', null,    2, 1740],
    ],
  },
  {
    no: '22691', name: 'Bangalore Rajdhani Express', type: 'RAJDHANI',
    from: 'SBC', to: 'NDLS', days: 'Tue,Wed,Fri,Sun', classes: ['1A', '2A', '3A'],
    stops: [
      ['SBC',  null,    '20:00', 1,    0],
      ['SC',   '21:40', '21:45', 1,  114],
      ['WADI', '23:30', '23:32', 1,  291],
      ['NGP',  '04:50', '05:00', 2,  657],
      ['BPL',  '09:55', '10:00', 2, 1038],
      ['JHS',  '13:55', '13:57', 2, 1337],
      ['GWL',  '15:43', '15:45', 2, 1436],
      ['NDLS', '18:10', null,    2, 1740],
    ],
  },
  {
    no: '12628', name: 'Karnataka Express', type: 'SF',
    from: 'NDLS', to: 'SBC', days: 'Daily', classes: ['1A', '2A', '3A', 'SL'],
    stops: [
      ['NDLS', null,    '22:30', 1,    0],
      ['AGC',  '01:05', '01:10', 2,  188],
      ['GWL',  '02:35', '02:40', 2,  304],
      ['JHS',  '04:40', '04:45', 2,  403],
      ['BPL',  '09:00', '09:15', 2,  702],
      ['NGP',  '15:10', '15:25', 2, 1083],
      ['SC',   '21:45', '22:00', 2, 1549],
      ['SBC',  '10:00', null,    3, 1740],
    ],
  },
  {
    no: '12627', name: 'Karnataka Express', type: 'SF',
    from: 'SBC', to: 'NDLS', days: 'Daily', classes: ['1A', '2A', '3A', 'SL'],
    stops: [
      ['SBC',  null,    '14:30', 1,    0],
      ['SC',   '16:10', '16:20', 1,  114],
      ['NGP',  '23:05', '23:20', 1,  657],
      ['BPL',  '05:30', '05:45', 2, 1038],
      ['JHS',  '10:05', '10:10', 2, 1337],
      ['GWL',  '11:50', '11:55', 2, 1436],
      ['AGC',  '13:27', '13:30', 2, 1552],
      ['NDLS', '06:15', null,    3, 1740],
    ],
  },

  // ── DELHI ↔ CHENNAI ───────────────────────────────────────────────────────
  {
    no: '12622', name: 'Tamil Nadu Express', type: 'SF',
    from: 'NDLS', to: 'MAS', days: 'Daily', classes: ['1A', '2A', '3A', 'SL'],
    stops: [
      ['NDLS', null,    '22:30', 1,    0],
      ['AGC',  '01:05', '01:10', 2,  188],
      ['GWL',  '02:35', '02:40', 2,  304],
      ['JHS',  '04:40', '04:45', 2,  403],
      ['BPL',  '09:15', '09:25', 2,  702],
      ['NGP',  '15:30', '15:45', 2, 1083],
      ['BZA',  '03:25', '03:40', 3, 1672],
      ['MAS',  '07:30', null,    3, 2182],
    ],
  },
  {
    no: '12621', name: 'Tamil Nadu Express', type: 'SF',
    from: 'MAS', to: 'NDLS', days: 'Daily', classes: ['1A', '2A', '3A', 'SL'],
    stops: [
      ['MAS',  null,    '22:00', 1,    0],
      ['BZA',  '02:00', '02:15', 2,  431],
      ['NGP',  '14:05', '14:20', 2, 1099],
      ['BPL',  '20:15', '20:30', 2, 1480],
      ['JHS',  '00:40', '00:45', 3, 1779],
      ['GWL',  '02:30', '02:35', 3, 1878],
      ['AGC',  '04:12', '04:15', 3, 1994],
      ['NDLS', '07:25', null,    3, 2182],
    ],
  },

  // ── DELHI ↔ KOLKATA ───────────────────────────────────────────────────────
  {
    no: '12301', name: 'Howrah Rajdhani Express', type: 'RAJDHANI',
    from: 'NDLS', to: 'HWH', days: 'Daily', classes: ['1A', '2A', '3A'],
    stops: [
      ['NDLS', null,    '16:55', 1,    0],
      ['CNB',  '21:45', '21:50', 1,  440],
      ['ALD',  '23:55', '00:00', 1,  641],
      ['GAYA', '04:50', '04:55', 2,  997],
      ['DHN',  '07:30', '07:35', 2, 1181],
      ['ASN',  '08:35', '08:40', 2, 1241],
      ['HWH',  '10:05', null,    2, 1441],
    ],
  },
  {
    no: '12302', name: 'Howrah Rajdhani Express', type: 'RAJDHANI',
    from: 'HWH', to: 'NDLS', days: 'Daily', classes: ['1A', '2A', '3A'],
    stops: [
      ['HWH',  null,    '16:50', 1,    0],
      ['ASN',  '18:15', '18:20', 1,  200],
      ['DHN',  '19:20', '19:25', 1,  260],
      ['GAYA', '21:55', '22:00', 1,  444],
      ['ALD',  '01:45', '01:50', 2,  800],
      ['CNB',  '03:55', '04:00', 2, 1001],
      ['NDLS', '10:00', null,    2, 1441],
    ],
  },
  {
    no: '12304', name: 'Poorva Express', type: 'SF',
    from: 'HWH', to: 'NDLS', days: 'Tue,Thu,Sat', classes: ['1A', '2A', '3A', 'SL'],
    stops: [
      ['HWH',  null,    '08:15', 1,    0],
      ['ASN',  '09:55', '10:00', 1,  200],
      ['DHN',  '11:05', '11:10', 1,  260],
      ['GAYA', '13:45', '13:55', 1,  444],
      ['ALD',  '17:55', '18:05', 1,  800],
      ['CNB',  '20:10', '20:20', 1, 1001],
      ['NDLS', '05:05', null,    2, 1441],
    ],
  },
  {
    no: '12303', name: 'Poorva Express', type: 'SF',
    from: 'NDLS', to: 'HWH', days: 'Mon,Wed,Fri', classes: ['1A', '2A', '3A', 'SL'],
    stops: [
      ['NDLS', null,    '22:15', 1,    0],
      ['CNB',  '03:15', '03:25', 2,  440],
      ['ALD',  '05:30', '05:40', 2,  641],
      ['GAYA', '09:45', '09:55', 2,  997],
      ['DHN',  '12:30', '12:35', 2, 1181],
      ['ASN',  '13:35', '13:40', 2, 1241],
      ['HWH',  '20:25', null,    2, 1441],
    ],
  },

  // ── DELHI ↔ PATNA ─────────────────────────────────────────────────────────
  {
    no: '12310', name: 'Patna Rajdhani Express', type: 'RAJDHANI',
    from: 'NDLS', to: 'PNBE', days: 'Daily', classes: ['1A', '2A', '3A'],
    stops: [
      ['NDLS', null,    '18:00', 1,    0],
      ['CNB',  '22:55', '23:00', 1,  440],
      ['ALD',  '01:05', '01:10', 2,  641],
      ['PNBE', '06:45', null,    2, 1050],
    ],
  },
  {
    no: '12309', name: 'Patna Rajdhani Express', type: 'RAJDHANI',
    from: 'PNBE', to: 'NDLS', days: 'Daily', classes: ['1A', '2A', '3A'],
    stops: [
      ['PNBE', null,    '18:00', 1,    0],
      ['ALD',  '22:45', '22:50', 1,  409],
      ['CNB',  '00:55', '01:00', 2,  610],
      ['NDLS', '06:45', null,    2, 1050],
    ],
  },

  // ── DELHI ↔ MUZAFFARPUR / DARBHANGA ──────────────────────────────────────
  {
    no: '12557', name: 'Sapt Kranti Express', type: 'SF',
    from: 'NDLS', to: 'MFP', days: 'Daily', classes: ['1A', '2A', '3A', 'SL'],
    stops: [
      ['NDLS', null,    '21:45', 1,    0],
      ['CNB',  '02:45', '02:50', 2,  440],
      ['ALD',  '05:00', '05:10', 2,  641],
      ['GAYA', '09:15', '09:20', 2,  997],
      ['PNBE', '11:40', '11:45', 2, 1050],
      ['HJP',  '12:30', '12:35', 2, 1093],
      ['CPR',  '13:35', '13:40', 2, 1134],
      ['MFP',  '14:45', null,    2, 1162],
    ],
  },
  {
    no: '12558', name: 'Sapt Kranti Express', type: 'SF',
    from: 'MFP', to: 'NDLS', days: 'Daily', classes: ['1A', '2A', '3A', 'SL'],
    stops: [
      ['MFP',  null,    '16:05', 1,    0],
      ['CPR',  '17:10', '17:15', 1,   28],
      ['HJP',  '18:20', '18:25', 1,   69],
      ['PNBE', '19:05', '19:10', 1,  112],
      ['GAYA', '21:30', '21:35', 1,  165],
      ['ALD',  '01:50', '02:00', 2,  521],
      ['CNB',  '04:10', '04:20', 2,  722],
      ['NDLS', '09:45', null,    2, 1162],
    ],
  },
  {
    no: '12553', name: 'Vaishali Express', type: 'SF',
    from: 'NDLS', to: 'MFP', days: 'Daily', classes: ['1A', '2A', '3A', 'SL'],
    stops: [
      ['NDLS', null,    '14:00', 1,    0],
      ['CNB',  '19:35', '19:40', 1,  440],
      ['ALD',  '21:50', '22:00', 1,  641],
      ['GAYA', '02:35', '02:45', 2,  997],
      ['PNBE', '05:10', '05:15', 2, 1050],
      ['HJP',  '05:55', '06:00', 2, 1093],
      ['SPJ',  '07:05', '07:10', 2, 1132],
      ['MFP',  '08:05', null,    2, 1162],
    ],
  },
  {
    no: '12554', name: 'Vaishali Express', type: 'SF',
    from: 'MFP', to: 'NDLS', days: 'Daily', classes: ['1A', '2A', '3A', 'SL'],
    stops: [
      ['MFP',  null,    '18:10', 1,    0],
      ['SPJ',  '19:00', '19:05', 1,   30],
      ['HJP',  '20:10', '20:15', 1,   69],
      ['PNBE', '21:00', '21:05', 1,  112],
      ['GAYA', '23:25', '23:35', 1,  165],
      ['ALD',  '04:10', '04:20', 2,  521],
      ['CNB',  '06:30', '06:40', 2,  722],
      ['NDLS', '12:30', null,    2, 1162],
    ],
  },
  {
    no: '12562', name: 'Saharsa - New Delhi Express', type: 'SF',
    from: 'DBG', to: 'NDLS', days: 'Daily', classes: ['2A', '3A', 'SL'],
    stops: [
      ['DBG',  null,    '15:00', 1,    0],
      ['SPJ',  '15:55', '16:00', 1,   48],
      ['MFP',  '17:00', '17:10', 1,   80],
      ['HJP',  '18:05', '18:10', 1,  119],
      ['PNBE', '19:05', '19:15', 1,  162],
      ['ALD',  '01:00', '01:10', 2,  562],
      ['CNB',  '03:20', '03:30', 2,  762],
      ['NDLS', '09:30', null,    2, 1202],
    ],
  },
  {
    no: '12561', name: 'New Delhi - Darbhanga Express', type: 'SF',
    from: 'NDLS', to: 'DBG', days: 'Daily', classes: ['2A', '3A', 'SL'],
    stops: [
      ['NDLS', null,    '14:45', 1,    0],
      ['CNB',  '20:30', '20:40', 1,  440],
      ['ALD',  '23:00', '23:10', 1,  641],
      ['PNBE', '04:50', '05:00', 2, 1040],
      ['HJP',  '05:45', '05:50', 2, 1083],
      ['MFP',  '06:55', '07:05', 2, 1122],
      ['SPJ',  '08:05', '08:10', 2, 1154],
      ['DBG',  '09:10', null,    2, 1202],
    ],
  },

  // ── DELHI ↔ GORAKHPUR / EAST UP ───────────────────────────────────────────
  {
    no: '12555', name: 'Gorakhdham Express', type: 'SF',
    from: 'NDLS', to: 'GKP', days: 'Daily', classes: ['1A', '2A', '3A', 'SL'],
    stops: [
      ['NDLS', null,    '18:05', 1,    0],
      ['CNB',  '23:10', '23:20', 1,  440],
      ['LKO',  '01:30', '01:40', 2,  497],
      ['BSB',  '06:25', '06:35', 2,  784],
      ['GKP',  '09:10', null,    2,  953],
    ],
  },
  {
    no: '12556', name: 'Gorakhdham Express', type: 'SF',
    from: 'GKP', to: 'NDLS', days: 'Daily', classes: ['1A', '2A', '3A', 'SL'],
    stops: [
      ['GKP',  null,    '18:05', 1,    0],
      ['BSB',  '20:55', '21:05', 1,  169],
      ['LKO',  '01:55', '02:10', 2,  456],
      ['CNB',  '04:30', '04:40', 2,  513],
      ['NDLS', '10:30', null,    2,  953],
    ],
  },

  // ── DELHI ↔ LUCKNOW ───────────────────────────────────────────────────────
  {
    no: '12229', name: 'Lucknow Mail', type: 'EXP',
    from: 'NDLS', to: 'LKO', days: 'Daily', classes: ['1A', '2A', '3A', 'SL'],
    stops: [
      ['NDLS', null,    '22:45', 1,    0],
      ['GZB',  '23:20', '23:22', 1,   18],
      ['CNB',  '04:30', '04:40', 2,  440],
      ['LKO',  '06:10', null,    2,  497],
    ],
  },
  {
    no: '12230', name: 'Lucknow Mail', type: 'EXP',
    from: 'LKO', to: 'NDLS', days: 'Daily', classes: ['1A', '2A', '3A', 'SL'],
    stops: [
      ['LKO',  null,    '21:00', 1,    0],
      ['CNB',  '22:40', '22:50', 1,   57],
      ['GZB',  '04:00', '04:05', 2,  479],
      ['NDLS', '04:40', null,    2,  497],
    ],
  },
  {
    no: '12003', name: 'Lucknow Shatabdi Express', type: 'SHATABDI',
    from: 'NDLS', to: 'LKO', days: 'Except Sun', classes: ['CC', 'EC'],
    stops: [
      ['NDLS', null,    '06:10', 1,    0],
      ['GZB',  '06:40', '06:42', 1,   18],
      ['CNB',  '10:00', '10:10', 1,  440],
      ['LKO',  '12:00', null,    1,  497],
    ],
  },
  {
    no: '12004', name: 'Lucknow Shatabdi Express', type: 'SHATABDI',
    from: 'LKO', to: 'NDLS', days: 'Except Sun', classes: ['CC', 'EC'],
    stops: [
      ['LKO',  null,    '16:30', 1,    0],
      ['CNB',  '18:10', '18:20', 1,   57],
      ['GZB',  '21:30', '21:32', 1,  479],
      ['NDLS', '22:10', null,    1,  497],
    ],
  },

  // ── DELHI ↔ RAJASTHAN ─────────────────────────────────────────────────────
  {
    no: '12015', name: 'Ajmer Shatabdi Express', type: 'SHATABDI',
    from: 'NDLS', to: 'AII', days: 'Daily', classes: ['CC', 'EC'],
    stops: [
      ['NDLS', null,    '06:05', 1,    0],
      ['JP',   '10:25', '10:35', 1,  308],
      ['AII',  '12:55', null,    1,  441],
    ],
  },
  {
    no: '12016', name: 'Ajmer Shatabdi Express', type: 'SHATABDI',
    from: 'AII', to: 'NDLS', days: 'Daily', classes: ['CC', 'EC'],
    stops: [
      ['AII',  null,    '14:35', 1,    0],
      ['JP',   '16:55', '17:05', 1,  133],
      ['NDLS', '21:20', null,    1,  441],
    ],
  },
  {
    no: '12958', name: 'Swarna Jayanti Rajdhani Express', type: 'RAJDHANI',
    from: 'NDLS', to: 'ADI', days: 'Daily', classes: ['1A', '2A', '3A'],
    stops: [
      ['NDLS', null,    '19:45', 1,    0],
      ['JP',   '23:55', '00:00', 1,  308],
      ['AII',  '01:30', '01:35', 2,  441],
      ['ADI',  '11:05', null,    2,  943],
    ],
  },
  {
    no: '12957', name: 'Swarna Jayanti Rajdhani Express', type: 'RAJDHANI',
    from: 'ADI', to: 'NDLS', days: 'Daily', classes: ['1A', '2A', '3A'],
    stops: [
      ['ADI',  null,    '15:30', 1,    0],
      ['AII',  '20:55', '21:00', 1,  502],
      ['JP',   '22:30', '22:35', 1,  635],
      ['NDLS', '05:50', null,    2,  943],
    ],
  },

  // ── DELHI ↔ PUNJAB / NORTH ────────────────────────────────────────────────
  {
    no: '12014', name: 'Amritsar Shatabdi Express', type: 'SHATABDI',
    from: 'NDLS', to: 'ASR', days: 'Daily', classes: ['CC', 'EC'],
    stops: [
      ['NDLS', null,    '07:20', 1,    0],
      ['UMB',  '09:35', '09:37', 1,  199],
      ['LDH',  '10:40', '10:42', 1,  311],
      ['JUC',  '11:30', '11:35', 1,  363],
      ['ASR',  '13:10', null,    1,  449],
    ],
  },
  {
    no: '12013', name: 'Amritsar Shatabdi Express', type: 'SHATABDI',
    from: 'ASR', to: 'NDLS', days: 'Daily', classes: ['CC', 'EC'],
    stops: [
      ['ASR',  null,    '16:30', 1,    0],
      ['JUC',  '18:05', '18:10', 1,   86],
      ['LDH',  '18:55', '18:57', 1,  138],
      ['UMB',  '20:00', '20:02', 1,  250],
      ['NDLS', '22:20', null,    1,  449],
    ],
  },

  // ── DELHI ↔ GUJARAT ───────────────────────────────────────────────────────
  {
    no: '12918', name: 'Gujarat Express', type: 'EXP',
    from: 'NDLS', to: 'ADI', days: 'Daily', classes: ['1A', '2A', '3A', 'SL'],
    stops: [
      ['NDLS', null,    '06:35', 1,    0],
      ['JP',   '11:40', '11:55', 1,  308],
      ['AII',  '13:30', '13:40', 1,  441],
      ['ADI',  '00:20', null,    2,  943],
    ],
  },
  {
    no: '12917', name: 'Gujarat Express', type: 'EXP',
    from: 'ADI', to: 'NDLS', days: 'Daily', classes: ['1A', '2A', '3A', 'SL'],
    stops: [
      ['ADI',  null,    '05:20', 1,    0],
      ['AII',  '14:00', '14:15', 1,  502],
      ['JP',   '16:00', '16:15', 1,  635],
      ['NDLS', '21:35', null,    1,  943],
    ],
  },

  // ── DELHI ↔ HYDERABAD ─────────────────────────────────────────────────────
  {
    no: '12724', name: 'Telangana Express', type: 'SF',
    from: 'NDLS', to: 'HYB', days: 'Daily', classes: ['1A', '2A', '3A', 'SL'],
    stops: [
      ['NDLS', null,    '06:25', 1,    0],
      ['AGC',  '09:15', '09:20', 1,  188],
      ['JHS',  '13:00', '13:10', 1,  403],
      ['BPL',  '19:05', '19:20', 1,  702],
      ['NGP',  '01:40', '01:55', 2, 1083],
      ['SC',   '09:35', '09:40', 2, 1549],
      ['HYB',  '10:20', null,    2, 1590],
    ],
  },
  {
    no: '12723', name: 'Telangana Express', type: 'SF',
    from: 'HYB', to: 'NDLS', days: 'Daily', classes: ['1A', '2A', '3A', 'SL'],
    stops: [
      ['HYB',  null,    '06:00', 1,    0],
      ['SC',   '06:50', '07:00', 1,   41],
      ['NGP',  '14:35', '14:50', 1,  507],
      ['BPL',  '21:50', '22:05', 1,  888],
      ['JHS',  '03:50', '04:00', 2, 1187],
      ['AGC',  '08:15', '08:20', 2, 1402],
      ['NDLS', '11:15', null,    2, 1590],
    ],
  },

  // ── MUMBAI LTT ↔ BIHAR ───────────────────────────────────────────────────
  {
    no: '12141', name: 'LTT Muzaffarpur SF Express', type: 'SF',
    from: 'LTT', to: 'MFP', days: 'Daily', classes: ['1A', '2A', '3A', 'SL'],
    stops: [
      ['LTT',  null,    '12:00', 1,    0],
      ['KYN',  '13:00', '13:05', 1,   55],
      ['NGP',  '21:30', '21:45', 1,  835],
      ['BSB',  '08:00', '08:15', 2, 1618],
      ['PNBE', '13:30', '13:40', 2, 1840],
      ['HJP',  '14:30', '14:35', 2, 1883],
      ['SPJ',  '15:35', '15:40', 2, 1922],
      ['MFP',  '16:30', null,    2, 1952],
    ],
  },
  {
    no: '12142', name: 'Muzaffarpur LTT SF Express', type: 'SF',
    from: 'MFP', to: 'LTT', days: 'Daily', classes: ['1A', '2A', '3A', 'SL'],
    stops: [
      ['MFP',  null,    '07:45', 1,    0],
      ['SPJ',  '08:35', '08:40', 1,   30],
      ['HJP',  '09:45', '09:50', 1,   69],
      ['PNBE', '10:45', '10:55', 1,  112],
      ['BSB',  '16:30', '16:45', 1,  334],
      ['NGP',  '03:35', '03:50', 2, 1117],
      ['KYN',  '11:00', '11:05', 2, 1897],
      ['LTT',  '11:30', null,    2, 1952],
    ],
  },
  {
    no: '11061', name: 'LTT Darbhanga Express', type: 'EXP',
    from: 'LTT', to: 'DBG', days: 'Daily', classes: ['2A', '3A', 'SL'],
    stops: [
      ['LTT',  null,    '17:00', 1,    0],
      ['NGP',  '03:30', '03:45', 2,  835],
      ['BSB',  '16:30', '16:45', 2, 1618],
      ['PNBE', '22:15', '22:30', 2, 1840],
      ['HJP',  '23:25', '23:30', 2, 1883],
      ['MFP',  '00:45', '00:55', 3, 1952],
      ['SPJ',  '01:55', '02:00', 3, 1982],
      ['DBG',  '03:10', null,    3, 2030],
    ],
  },
  {
    no: '11062', name: 'Darbhanga LTT Express', type: 'EXP',
    from: 'DBG', to: 'LTT', days: 'Daily', classes: ['2A', '3A', 'SL'],
    stops: [
      ['DBG',  null,    '12:10', 1,    0],
      ['SPJ',  '13:20', '13:25', 1,   48],
      ['MFP',  '14:25', '14:35', 1,   78],
      ['HJP',  '15:35', '15:40', 1,  117],
      ['PNBE', '16:30', '16:45', 1,  160],
      ['BSB',  '22:30', '22:45', 1,  412],
      ['NGP',  '11:30', '11:45', 2, 1195],
      ['LTT',  '22:00', null,    2, 2030],
    ],
  },

  // ── MUMBAI CSMT ↔ KOLKATA ─────────────────────────────────────────────────
  {
    no: '12810', name: 'Howrah Mail', type: 'EXP',
    from: 'CSTM', to: 'HWH', days: 'Daily', classes: ['1A', '2A', '3A', 'SL'],
    stops: [
      ['CSTM', null,    '21:35', 1,    0],
      ['NGP',  '08:15', '08:30', 2, 1003],
      ['RNC',  '16:10', '16:25', 2, 1410],
      ['DHN',  '19:05', '19:15', 2, 1554],
      ['ASN',  '20:20', '20:25', 2, 1614],
      ['HWH',  '23:30', null,    2, 1968],
    ],
  },
  {
    no: '12809', name: 'Howrah Mail', type: 'EXP',
    from: 'HWH', to: 'CSTM', days: 'Daily', classes: ['1A', '2A', '3A', 'SL'],
    stops: [
      ['HWH',  null,    '20:10', 1,    0],
      ['ASN',  '21:35', '21:40', 1,  200],
      ['DHN',  '22:40', '22:50', 1,  260],
      ['RNC',  '01:45', '02:00', 2,  414],
      ['NGP',  '09:50', '10:05', 2,  821],
      ['CSTM', '21:40', null,    2, 1968],
    ],
  },

  // ── DADAR ↔ SAINAGAR SHIRDI ──────────────────────────────────────────────
  {
    no: '11041', name: 'Sainagar Shirdi Express', type: 'EXP',
    from: 'DR', to: 'SNSI', days: 'Daily', classes: ['2A', '3A', 'SL'],
    stops: [
      ['DR',   null,    '23:55', 1,   0],
      ['PUNE', '02:20', '02:30', 2, 192],
      ['AII',  '06:50', '07:00', 2, 470],
      ['SNSI', '08:40', null,    2, 571],
    ],
  },
  {
    no: '11042', name: 'Sainagar Shirdi Express', type: 'EXP',
    from: 'SNSI', to: 'DR', days: 'Daily', classes: ['2A', '3A', 'SL'],
    stops: [
      ['SNSI', null,    '09:30', 1,   0],
      ['AII',  '11:25', '11:35', 1, 101],
      ['PUNE', '17:45', '17:55', 1, 379],
      ['DR',   '20:25', null,    1, 571],
    ],
  },

  // ── DELHI ↔ DEHRADUN ─────────────────────────────────────────────────────
  {
    no: '12018', name: 'Dehradun Shatabdi Express', type: 'SHATABDI',
    from: 'NDLS', to: 'DDN', days: 'Daily', classes: ['CC', 'EC'],
    stops: [
      ['NDLS', null,    '06:45', 1,    0],
      ['HW',   '10:20', '10:25', 1,  182],
      ['DDN',  '11:40', null,    1,  320],
    ],
  },
  {
    no: '12017', name: 'Dehradun Shatabdi Express', type: 'SHATABDI',
    from: 'DDN', to: 'NDLS', days: 'Daily', classes: ['CC', 'EC'],
    stops: [
      ['DDN',  null,    '17:00', 1,    0],
      ['HW',   '18:20', '18:25', 1,  138],
      ['NDLS', '22:00', null,    1,  320],
    ],
  },

  // ── MUMBAI ↔ SURAT / AHMEDABAD (WR) ──────────────────────────────────────
  {
    no: '12921', name: 'Flying Ranee Express', type: 'EXP',
    from: 'BCT', to: 'ADI', days: 'Daily', classes: ['1A', '2A', '3A', 'SL'],
    stops: [
      ['BCT',  null,    '14:35', 1,   0],
      ['BVI',  '15:05', '15:07', 1,  29],
      ['ST',   '18:50', '18:55', 1, 263],
      ['BRC',  '20:35', '20:40', 1, 390],
      ['ADI',  '22:15', null,    1, 493],
    ],
  },
  {
    no: '12922', name: 'Flying Ranee Express', type: 'EXP',
    from: 'ADI', to: 'BCT', days: 'Daily', classes: ['1A', '2A', '3A', 'SL'],
    stops: [
      ['ADI',  null,    '07:20', 1,   0],
      ['BRC',  '08:45', '08:50', 1, 103],
      ['ST',   '10:30', '10:35', 1, 230],
      ['BVI',  '14:05', '14:07', 1, 464],
      ['BCT',  '14:35', null,    1, 493],
    ],
  },
  {
    no: '12901', name: 'Gujarat Mail', type: 'EXP',
    from: 'BCT', to: 'ADI', days: 'Daily', classes: ['1A', '2A', '3A', 'SL'],
    stops: [
      ['BCT',  null,    '22:00', 1,   0],
      ['ST',   '02:30', '02:35', 2, 263],
      ['BRC',  '04:10', '04:20', 2, 390],
      ['ADI',  '06:15', null,    2, 493],
    ],
  },
  {
    no: '12902', name: 'Gujarat Mail', type: 'EXP',
    from: 'ADI', to: 'BCT', days: 'Daily', classes: ['1A', '2A', '3A', 'SL'],
    stops: [
      ['ADI',  null,    '20:35', 1,   0],
      ['BRC',  '22:20', '22:25', 1, 103],
      ['ST',   '00:05', '00:10', 2, 230],
      ['BCT',  '04:30', null,    2, 493],
    ],
  },
  {
    no: '12009', name: 'Mumbai Ahmedabad Shatabdi Express', type: 'SHATABDI',
    from: 'BCT', to: 'ADI', days: 'Daily', classes: ['CC', 'EC'],
    stops: [
      ['BCT',  null,    '06:25', 1,   0],
      ['ST',   '08:52', '08:55', 1, 263],
      ['BRC',  '10:10', '10:15', 1, 390],
      ['ADI',  '11:35', null,    1, 493],
    ],
  },
  {
    no: '12010', name: 'Ahmedabad Mumbai Shatabdi Express', type: 'SHATABDI',
    from: 'ADI', to: 'BCT', days: 'Daily', classes: ['CC', 'EC'],
    stops: [
      ['ADI',  null,    '17:35', 1,   0],
      ['BRC',  '18:55', '19:00', 1, 103],
      ['ST',   '20:20', '20:25', 1, 230],
      ['BCT',  '22:45', null,    1, 493],
    ],
  },

  // ── MUMBAI CSMT ↔ NASHIK / MANMAD (CR) ───────────────────────────────────
  {
    no: '12107', name: 'Panchavati Express', type: 'EXP',
    from: 'CSTM', to: 'MMR', days: 'Daily', classes: ['2A', '3A', 'SL'],
    stops: [
      ['CSTM', null,    '17:10', 1,   0],
      ['KYN',  '18:15', '18:20', 1,  55],
      ['IGP',  '21:05', '21:10', 1, 121],
      ['NK',   '22:00', '22:05', 1, 165],
      ['MMR',  '23:45', null,    1, 251],
    ],
  },
  {
    no: '12108', name: 'Panchavati Express', type: 'EXP',
    from: 'MMR', to: 'CSTM', days: 'Daily', classes: ['2A', '3A', 'SL'],
    stops: [
      ['MMR',  null,    '06:05', 1,   0],
      ['NK',   '07:35', '07:40', 1,  86],
      ['IGP',  '08:40', '08:45', 1, 130],
      ['KYN',  '11:55', '12:00', 1, 196],
      ['CSTM', '12:35', null,    1, 251],
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
async function upsertStation(s) {
  return prisma.railStation.upsert({
    where: { code: s[0] },
    update: { name: s[1], city: s[2], state: s[3], zone: s[4], lat: s[5], lng: s[6] },
    create: { code: s[0], name: s[1], city: s[2], state: s[3], zone: s[4], lat: s[5], lng: s[6] },
  });
}

async function upsertTrain(t) {
  const train = await prisma.railTrain.upsert({
    where:  { trainNo: t.no },
    update: { trainName: t.name, trainType: t.type, fromCode: t.from, toCode: t.to, runDays: t.days, classes: t.classes },
    create: { trainNo: t.no, trainName: t.name, trainType: t.type, fromCode: t.from, toCode: t.to, runDays: t.days, classes: t.classes },
  });

  // Clear old stops and re-insert
  await prisma.railStop.deleteMany({ where: { trainId: train.id } });
  for (let i = 0; i < t.stops.length; i++) {
    const [code, arr, dep, day, km] = t.stops[i];
    await prisma.railStop.create({
      data: {
        trainId:       train.id,
        stationCode:   code,
        sequence:      i + 1,
        arrivalTime:   arr,
        departureTime: dep,
        dayCount:      day,
        distanceKm:    km,
      },
    });
  }
  return train;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Seeding rail stations...');
  for (const s of STATIONS) {
    await upsertStation(s);
  }
  console.log(`  ✓ ${STATIONS.length} stations done`);

  console.log('Seeding rail trains...');
  let count = 0;
  for (const t of TRAINS) {
    await upsertTrain(t);
    count++;
    process.stdout.write(`\r  ✓ ${count}/${TRAINS.length} trains`);
  }
  console.log(`\n  ✓ ${count} trains with stops done`);
  console.log('\nRail seed complete!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
