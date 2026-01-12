import { supabase } from './supabase.js';

// Major US Ski Resorts with coordinates
const SKI_RESORTS = [
  // COLORADO (Rockies)
  { id: 'vail', name: 'Vail', state: 'CO', region: 'Rockies', lat: 39.6403, lng: -106.3742, lifts: 31, trails: 195 },
  { id: 'breckenridge', name: 'Breckenridge', state: 'CO', region: 'Rockies', lat: 39.4817, lng: -106.0384, lifts: 35, trails: 187 },
  { id: 'aspen-snowmass', name: 'Aspen Snowmass', state: 'CO', region: 'Rockies', lat: 39.2084, lng: -106.9490, lifts: 24, trails: 98 },
  { id: 'aspen-mountain', name: 'Aspen Mountain', state: 'CO', region: 'Rockies', lat: 39.1875, lng: -106.8185, lifts: 8, trails: 76 },
  { id: 'copper-mountain', name: 'Copper Mountain', state: 'CO', region: 'Rockies', lat: 39.5022, lng: -106.1497, lifts: 24, trails: 147 },
  { id: 'keystone', name: 'Keystone', state: 'CO', region: 'Rockies', lat: 39.6045, lng: -105.9422, lifts: 20, trails: 128 },
  { id: 'steamboat', name: 'Steamboat', state: 'CO', region: 'Rockies', lat: 40.4572, lng: -106.8045, lifts: 18, trails: 169 },
  { id: 'winter-park', name: 'Winter Park', state: 'CO', region: 'Rockies', lat: 39.8868, lng: -105.7625, lifts: 24, trails: 166 },
  { id: 'telluride', name: 'Telluride', state: 'CO', region: 'Rockies', lat: 37.9375, lng: -107.8123, lifts: 18, trails: 148 },
  { id: 'crested-butte', name: 'Crested Butte', state: 'CO', region: 'Rockies', lat: 38.8991, lng: -106.9658, lifts: 15, trails: 121 },
  { id: 'arapahoe-basin', name: 'Arapahoe Basin', state: 'CO', region: 'Rockies', lat: 39.6425, lng: -105.8719, lifts: 9, trails: 147 },
  { id: 'beaver-creek', name: 'Beaver Creek', state: 'CO', region: 'Rockies', lat: 39.6042, lng: -106.5164, lifts: 24, trails: 150 },
  { id: 'loveland', name: 'Loveland', state: 'CO', region: 'Rockies', lat: 39.6800, lng: -105.8978, lifts: 11, trails: 94 },
  { id: 'purgatory', name: 'Purgatory', state: 'CO', region: 'Rockies', lat: 37.6303, lng: -107.8139, lifts: 12, trails: 105 },
  
  // UTAH (Rockies)
  { id: 'park-city', name: 'Park City', state: 'UT', region: 'Rockies', lat: 40.6514, lng: -111.5080, lifts: 41, trails: 348 },
  { id: 'snowbird', name: 'Snowbird', state: 'UT', region: 'Rockies', lat: 40.5830, lng: -111.6556, lifts: 13, trails: 169 },
  { id: 'alta', name: 'Alta', state: 'UT', region: 'Rockies', lat: 40.5884, lng: -111.6378, lifts: 11, trails: 119 },
  { id: 'deer-valley', name: 'Deer Valley', state: 'UT', region: 'Rockies', lat: 40.6375, lng: -111.4783, lifts: 21, trails: 103 },
  { id: 'brighton', name: 'Brighton', state: 'UT', region: 'Rockies', lat: 40.5980, lng: -111.5832, lifts: 7, trails: 66 },
  { id: 'solitude', name: 'Solitude', state: 'UT', region: 'Rockies', lat: 40.6199, lng: -111.5919, lifts: 8, trails: 82 },
  { id: 'snowbasin', name: 'Snowbasin', state: 'UT', region: 'Rockies', lat: 41.2160, lng: -111.8569, lifts: 9, trails: 107 },
  { id: 'powder-mountain', name: 'Powder Mountain', state: 'UT', region: 'Rockies', lat: 41.3789, lng: -111.7808, lifts: 9, trails: 167 },
  
  // WYOMING (Rockies)
  { id: 'jackson-hole', name: 'Jackson Hole', state: 'WY', region: 'Rockies', lat: 43.5875, lng: -110.8278, lifts: 13, trails: 131 },
  { id: 'grand-targhee', name: 'Grand Targhee', state: 'WY', region: 'Rockies', lat: 43.7872, lng: -110.9581, lifts: 5, trails: 95 },
  
  // MONTANA (Rockies)
  { id: 'big-sky', name: 'Big Sky', state: 'MT', region: 'Rockies', lat: 45.2856, lng: -111.4019, lifts: 39, trails: 317 },
  { id: 'whitefish', name: 'Whitefish Mountain', state: 'MT', region: 'Rockies', lat: 48.4800, lng: -114.3514, lifts: 14, trails: 107 },
  { id: 'bridger-bowl', name: 'Bridger Bowl', state: 'MT', region: 'Rockies', lat: 45.8172, lng: -110.8978, lifts: 8, trails: 75 },
  
  // IDAHO (Rockies)
  { id: 'sun-valley', name: 'Sun Valley', state: 'ID', region: 'Rockies', lat: 43.6975, lng: -114.3514, lifts: 18, trails: 121 },
  { id: 'schweitzer', name: 'Schweitzer', state: 'ID', region: 'Rockies', lat: 48.3678, lng: -116.6231, lifts: 9, trails: 92 },
  
  // CALIFORNIA (Pacific)
  { id: 'mammoth-mountain', name: 'Mammoth Mountain', state: 'CA', region: 'Pacific', lat: 37.6308, lng: -119.0326, lifts: 28, trails: 175 },
  { id: 'squaw-valley', name: 'Palisades Tahoe', state: 'CA', region: 'Pacific', lat: 39.1970, lng: -120.2358, lifts: 42, trails: 270 },
  { id: 'heavenly', name: 'Heavenly', state: 'CA', region: 'Pacific', lat: 38.9353, lng: -119.9400, lifts: 28, trails: 97 },
  { id: 'kirkwood', name: 'Kirkwood', state: 'CA', region: 'Pacific', lat: 38.6850, lng: -120.0653, lifts: 15, trails: 86 },
  { id: 'northstar', name: 'Northstar', state: 'CA', region: 'Pacific', lat: 39.2746, lng: -120.1210, lifts: 20, trails: 100 },
  { id: 'big-bear', name: 'Big Bear Mountain', state: 'CA', region: 'Pacific', lat: 34.2367, lng: -116.8906, lifts: 14, trails: 55 },
  { id: 'sugar-bowl', name: 'Sugar Bowl', state: 'CA', region: 'Pacific', lat: 39.3008, lng: -120.3342, lifts: 13, trails: 103 },
  { id: 'mt-rose', name: 'Mt. Rose', state: 'NV', region: 'Pacific', lat: 39.3158, lng: -119.8856, lifts: 8, trails: 60 },
  
  // WASHINGTON (Pacific)
  { id: 'crystal-mountain', name: 'Crystal Mountain', state: 'WA', region: 'Pacific', lat: 46.9282, lng: -121.5047, lifts: 11, trails: 57 },
  { id: 'stevens-pass', name: 'Stevens Pass', state: 'WA', region: 'Pacific', lat: 47.7453, lng: -121.0889, lifts: 10, trails: 52 },
  { id: 'mt-baker', name: 'Mt. Baker', state: 'WA', region: 'Pacific', lat: 48.8575, lng: -121.6631, lifts: 8, trails: 38 },
  
  // OREGON (Pacific)
  { id: 'mt-hood-meadows', name: 'Mt. Hood Meadows', state: 'OR', region: 'Pacific', lat: 45.3314, lng: -121.6656, lifts: 11, trails: 87 },
  { id: 'mt-bachelor', name: 'Mt. Bachelor', state: 'OR', region: 'Pacific', lat: 43.9792, lng: -121.6886, lifts: 11, trails: 101 },
  { id: 'timberline', name: 'Timberline Lodge', state: 'OR', region: 'Pacific', lat: 45.3311, lng: -121.7103, lifts: 6, trails: 40 },
  
  // VERMONT (Northeast)
  { id: 'killington', name: 'Killington', state: 'VT', region: 'Northeast', lat: 43.6045, lng: -72.8201, lifts: 22, trails: 155 },
  { id: 'stowe', name: 'Stowe', state: 'VT', region: 'Northeast', lat: 44.5303, lng: -72.7814, lifts: 13, trails: 116 },
  { id: 'sugarbush', name: 'Sugarbush', state: 'VT', region: 'Northeast', lat: 44.1358, lng: -72.9042, lifts: 16, trails: 111 },
  { id: 'jay-peak', name: 'Jay Peak', state: 'VT', region: 'Northeast', lat: 44.9275, lng: -72.5056, lifts: 9, trails: 81 },
  { id: 'mount-snow', name: 'Mount Snow', state: 'VT', region: 'Northeast', lat: 42.9603, lng: -72.9206, lifts: 20, trails: 86 },
  { id: 'okemo', name: 'Okemo', state: 'VT', region: 'Northeast', lat: 43.4014, lng: -72.7172, lifts: 20, trails: 121 },
  { id: 'stratton', name: 'Stratton', state: 'VT', region: 'Northeast', lat: 43.1133, lng: -72.9086, lifts: 11, trails: 99 },
  { id: 'mad-river-glen', name: 'Mad River Glen', state: 'VT', region: 'Northeast', lat: 44.2058, lng: -72.9167, lifts: 5, trails: 53 },
  
  // NEW HAMPSHIRE (Northeast)
  { id: 'loon-mountain', name: 'Loon Mountain', state: 'NH', region: 'Northeast', lat: 44.0364, lng: -71.6214, lifts: 11, trails: 61 },
  { id: 'cannon-mountain', name: 'Cannon Mountain', state: 'NH', region: 'Northeast', lat: 44.1564, lng: -71.6989, lifts: 11, trails: 97 },
  { id: 'bretton-woods', name: 'Bretton Woods', state: 'NH', region: 'Northeast', lat: 44.2578, lng: -71.4394, lifts: 10, trails: 97 },
  { id: 'wildcat-mountain', name: 'Wildcat Mountain', state: 'NH', region: 'Northeast', lat: 44.2642, lng: -71.2389, lifts: 5, trails: 49 },
  { id: 'attitash', name: 'Attitash', state: 'NH', region: 'Northeast', lat: 44.0828, lng: -71.2294, lifts: 11, trails: 68 },
  
  // MAINE (Northeast)
  { id: 'sugarloaf', name: 'Sugarloaf', state: 'ME', region: 'Northeast', lat: 45.0314, lng: -70.3131, lifts: 15, trails: 162 },
  { id: 'sunday-river', name: 'Sunday River', state: 'ME', region: 'Northeast', lat: 44.4733, lng: -70.8567, lifts: 18, trails: 135 },
  
  // NEW YORK (Northeast)
  { id: 'whiteface', name: 'Whiteface', state: 'NY', region: 'Northeast', lat: 44.3656, lng: -73.9031, lifts: 11, trails: 90 },
  { id: 'hunter-mountain', name: 'Hunter Mountain', state: 'NY', region: 'Northeast', lat: 42.1772, lng: -74.2306, lifts: 13, trails: 67 },
  { id: 'gore-mountain', name: 'Gore Mountain', state: 'NY', region: 'Northeast', lat: 43.6731, lng: -74.0069, lifts: 14, trails: 119 },
  
  // NEW MEXICO (Rockies)
  { id: 'taos', name: 'Taos Ski Valley', state: 'NM', region: 'Rockies', lat: 36.5967, lng: -105.4544, lifts: 15, trails: 110 },
  { id: 'ski-santa-fe', name: 'Ski Santa Fe', state: 'NM', region: 'Rockies', lat: 35.7958, lng: -105.8028, lifts: 7, trails: 86 },
  
  // MICHIGAN (Midwest)
  { id: 'boyne-mountain', name: 'Boyne Mountain', state: 'MI', region: 'Midwest', lat: 45.1697, lng: -84.9389, lifts: 12, trails: 60 },
  { id: 'crystal-mountain-mi', name: 'Crystal Mountain MI', state: 'MI', region: 'Midwest', lat: 44.5203, lng: -86.0031, lifts: 7, trails: 58 },
  
  // WISCONSIN (Midwest)
  { id: 'granite-peak', name: 'Granite Peak', state: 'WI', region: 'Midwest', lat: 44.9322, lng: -89.6828, lifts: 7, trails: 75 },
  
  // MINNESOTA (Midwest)
  { id: 'lutsen', name: 'Lutsen Mountains', state: 'MN', region: 'Midwest', lat: 47.6633, lng: -90.7028, lifts: 8, trails: 95 },
];

async function seed() {
  console.log('🌱 Starting database seed with Supabase...');
  
  // Seed all resorts
  for (const resort of SKI_RESORTS) {
    const { error } = await supabase
      .from('resorts')
      .upsert({
        id: resort.id,
        name: resort.name,
        location: `${resort.state}, USA`,
        state: resort.state,
        region: resort.region,
        latitude: resort.lat,
        longitude: resort.lng,
        total_lifts: resort.lifts,
        total_trails: resort.trails,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      });
    
    if (error) {
      console.error(`  ❌ ${resort.name}: ${error.message}`);
    } else {
      console.log(`  ✓ ${resort.name}`);
    }
  }

  console.log(`\n✅ Seeded ${SKI_RESORTS.length} ski resorts`);
  
  // Print stats
  const byRegion = SKI_RESORTS.reduce((acc, r) => {
    acc[r.region] = (acc[r.region] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\n📊 Resorts by region:');
  for (const [region, count] of Object.entries(byRegion)) {
    console.log(`   ${region}: ${count}`);
  }
}

seed()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  });
