const STAGE = Object.freeze({
  PENDING_MANAGER: 'PENDING_MANAGER',
  PENDING_HR:      'PENDING_HR',
  PENDING_VENDOR:  'PENDING_VENDOR',
  COMPLETED:       'COMPLETED',
  REJECTED:        'REJECTED',
  CANCELLED:       'CANCELLED',
});

const TYPE = Object.freeze({
  FLIGHT:       'FLIGHT',
  HOTEL:        'HOTEL',
  TRAIN:        'TRAIN',
  CAB:          'CAB',
  MEAL:         'MEAL',
  TRIP_PACKAGE: 'TRIP_PACKAGE',
});

module.exports = { STAGE, TYPE };
