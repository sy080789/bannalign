/**
 * Standard home upkeep for a Toronto house (freezing winters, flat roof). Months are when it's best
 * done there. `key` lets the starter picker hide tasks already added.
 */
export interface StarterTask {
  key: string
  name: string
  category: string
  interval_months: number
  month: number
  steps: string
  parts?: string
}

export const STARTER_CATEGORIES = ['Heating & air', 'Safety', 'Plumbing', 'Outside', 'Appliances']

export const STARTER: StarterTask[] = [
  // Heating & air
  { key: 'furnace-filter', name: 'Replace furnace filter', category: 'Heating & air', interval_months: 3, month: 0, steps: 'Turn the furnace off. Slide out the old filter, note the size printed on its edge, and slide in the new one with the airflow arrow pointing toward the furnace.', parts: 'Filter size: ' },
  { key: 'furnace-service', name: 'Furnace service', category: 'Heating & air', interval_months: 12, month: 9, steps: 'Book an HVAC tech before the cold sets in: burner and heat-exchanger check, CO test, igniter and blower cleaning.' },
  { key: 'ac-service', name: 'AC service', category: 'Heating & air', interval_months: 12, month: 5, steps: 'Book a tune-up before summer. Meanwhile clear leaves and debris from around the outdoor unit and gently hose the fins.' },
  { key: 'hrv-filter', name: 'Clean HRV/ERV filters', category: 'Heating & air', interval_months: 3, month: 0, steps: 'Open the unit, pull the filters, vacuum or rinse and let them dry fully. Check the outside vent hoods are clear.' },
  { key: 'humidifier', name: 'Replace humidifier pad', category: 'Heating & air', interval_months: 12, month: 10, steps: 'Turn the water off to the furnace humidifier, swap the evaporator pad, check the drain line is clear, and set the humidistat for winter (about 35%).', parts: 'Pad model: ' },
  { key: 'bath-fans', name: 'Clean bathroom fans', category: 'Heating & air', interval_months: 12, month: 0, steps: 'Switch off the breaker, pop the grille, vacuum the fan and wash the grille. Check it pulls a tissue up when running.' },
  // Safety
  { key: 'alarm-test', name: 'Test smoke & CO alarms', category: 'Safety', interval_months: 6, month: 4, steps: 'Press and hold the test button on every alarm until it sounds. Ontario law requires a working smoke alarm on every storey and a CO alarm outside sleeping areas.' },
  { key: 'alarm-batteries', name: 'Replace alarm batteries', category: 'Safety', interval_months: 12, month: 11, steps: 'Swap batteries in every smoke and CO alarm (a good habit when the clocks change in November), then test each one.', parts: 'Battery type: ' },
  { key: 'alarm-replace', name: 'Replace smoke & CO alarms', category: 'Safety', interval_months: 120, month: 0, steps: 'Smoke alarms last about 10 years and CO alarms 7–10. Check the date on the back; replace any that are past it.' },
  { key: 'extinguisher', name: 'Check fire extinguishers', category: 'Safety', interval_months: 12, month: 0, steps: 'Gauge needle in the green, pin and seal intact, no dents or rust. Turn dry-chemical ones upside down and tap the bottom.' },
  { key: 'dryer-vent', name: 'Clean dryer vent', category: 'Safety', interval_months: 12, month: 0, steps: 'Unplug the dryer, disconnect the duct, and brush or vacuum it out end to end. Check the outside flap opens freely.' },
  { key: 'gfci', name: 'Test GFCI outlets', category: 'Safety', interval_months: 6, month: 0, steps: 'Press TEST on each GFCI outlet (kitchen, bathrooms, outside, basement); power should cut. Press RESET.' },
  // Plumbing
  { key: 'water-heater', name: 'Flush water heater', category: 'Plumbing', interval_months: 12, month: 0, steps: 'Turn off power/gas (set to pilot), attach a hose to the drain valve, and drain a few buckets until the water runs clear. Test the pressure-relief valve. Skip if it\'s a rental unit the provider services.' },
  { key: 'sump-pump', name: 'Test sump pump', category: 'Plumbing', interval_months: 12, month: 3, steps: 'Before the spring thaw: pour a bucket of water into the pit and check the pump kicks on and drains it. Make sure the discharge line outside isn\'t frozen or blocked.' },
  { key: 'under-sinks', name: 'Check under sinks for leaks', category: 'Plumbing', interval_months: 6, month: 0, steps: 'Look and feel under every sink and around the toilets and washer hoses for drips, stains or soft spots.' },
  { key: 'outdoor-taps', name: 'Shut off & drain outdoor taps', category: 'Plumbing', interval_months: 12, month: 10, steps: 'Before the first freeze: disconnect hoses, close the indoor shut-off for each outside tap, then open the outside tap to drain it. Reverse in April.' },
  { key: 'main-shutoff', name: 'Test main water shut-off', category: 'Plumbing', interval_months: 12, month: 0, steps: 'Turn the main valve off and back on so it doesn\'t seize. Make sure everyone knows where it is.' },
  { key: 'caulk', name: 'Check tub & shower caulking', category: 'Plumbing', interval_months: 12, month: 0, steps: 'Look for cracked, peeling or mouldy caulk and grout. Cut out and re-caulk any bad sections.' },
  { key: 'aerators', name: 'Clean faucet aerators & showerheads', category: 'Plumbing', interval_months: 12, month: 0, steps: 'Unscrew aerators and soak them and showerheads in vinegar overnight to clear Toronto\'s hard-water scale.' },
  // Outside
  { key: 'gutters', name: 'Clean gutters & downspouts', category: 'Outside', interval_months: 6, month: 5, steps: 'Clear leaves and debris (late fall once the trees are bare, and again in spring). Flush downspouts and check they drain at least 2 m from the foundation.' },
  { key: 'flat-roof', name: 'Flat roof check', category: 'Outside', interval_months: 6, month: 4, steps: 'Clear drains and scuppers of leaves. Look for ponding water, blisters, cracks or lifted seams in the membrane, and check flashing. Book a roofer for anything suspicious.' },
  { key: 'window-caulk', name: 'Check window & door seals', category: 'Outside', interval_months: 12, month: 10, steps: 'Before winter: check exterior caulking and weatherstripping for gaps or drafts and replace where worn.' },
  { key: 'grading', name: 'Check grading & foundation', category: 'Outside', interval_months: 12, month: 4, steps: 'After the snow melts: make sure soil slopes away from the house and look for new foundation cracks or damp spots inside.' },
  { key: 'deck', name: 'Clean & reseal deck', category: 'Outside', interval_months: 24, month: 6, steps: 'Wash, let dry, and apply sealer or stain on a dry, mild stretch.' },
  { key: 'chimney', name: 'Chimney sweep & inspection', category: 'Outside', interval_months: 12, month: 9, steps: 'If you use a fireplace or wood stove, have it swept and inspected before the burning season.' },
  // Appliances
  { key: 'fridge-coils', name: 'Clean fridge coils', category: 'Appliances', interval_months: 12, month: 0, steps: 'Pull the fridge out or remove the bottom grille and vacuum the coils. Wipe the door gaskets.' },
  { key: 'dishwasher', name: 'Clean dishwasher filter', category: 'Appliances', interval_months: 3, month: 0, steps: 'Twist out the filter at the bottom, rinse under hot water with a soft brush, and lock it back in.' },
  { key: 'range-hood', name: 'Clean range hood filter', category: 'Appliances', interval_months: 3, month: 0, steps: 'Soak the metal filter in hot water with dish soap and baking soda, scrub, rinse and dry. Replace charcoal filters instead.' },
  { key: 'washer', name: 'Clean washing machine', category: 'Appliances', interval_months: 3, month: 0, steps: 'Run an empty hot cleaning cycle, wipe the door gasket and drawer, and leave the door open to dry. Check hoses for bulges.' },
]
