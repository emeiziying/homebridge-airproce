import {
  Service,
  CharacteristicValue,
  CharacteristicEventTypes,
  CharacteristicSetCallback,
  CharacteristicGetCallback,
  AccessoryConfig,
  AccessoryPlugin,
  API,
  Logging,
  HAP,
} from 'homebridge';

export class AirproceAccessory implements AccessoryPlugin {
  private readonly log: Logging;
  private readonly name: string;
  private readonly hash: string;
  private activeStatus = 0;

  private readonly airproceService: Service;
  private readonly informationService: Service;
  private readonly hap: HAP;

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.name = config.name;
    this.hash = config.hash;
    this.hap = api.hap;

    this.log.debug('Airproce Accessory Plugin Loaded');

    this.airproceService = new this.hap.Service.AirPurifier(this.name);
    this.airproceService
      .getCharacteristic(this.hap.Characteristic.Active)
      .on(CharacteristicEventTypes.GET, this.handleActiveGet.bind(this))
      .on(CharacteristicEventTypes.SET, this.handleActiveSet.bind(this));

    this.airproceService
      .getCharacteristic(this.hap.Characteristic.CurrentAirPurifierState)
      .on(
        CharacteristicEventTypes.GET,
        this.handleCurrentAirPurifierStateGet.bind(this),
      );

    this.airproceService
      .getCharacteristic(this.hap.Characteristic.TargetAirPurifierState)
      .on(
        CharacteristicEventTypes.GET,
        this.handleTargetAirPurifierStateGet.bind(this),
      )
      .on(
        CharacteristicEventTypes.SET,
        this.handleTargetAirPurifierStateSet.bind(this),
      );

    this.informationService = new this.hap.Service.AccessoryInformation()
      .setCharacteristic(this.hap.Characteristic.Manufacturer, 'emeiziying')
      .setCharacteristic(this.hap.Characteristic.Model, 'Airproce')
      .setCharacteristic(this.hap.Characteristic.SerialNumber, '001');

    log.info('Airproce finished initializing!');
  }

  /*
   * This method is optional to implement. It is called when HomeKit ask to identify the accessory.
   * Typical this only ever happens at the pairing process.
   */
  identify(): void {
    this.log('Identify!');
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {
    return [this.informationService, this.airproceService];
  }

  /**
   * Handle requests to get the current value of the "Active" characteristic
   */
  handleActiveGet(callback: CharacteristicGetCallback) {
    this.log.debug('Triggered GET Active');
    callback(null, this.activeStatus);
  }

  /**
   * Handle requests to set the "Active" characteristic
   */
  handleActiveSet(
    value: CharacteristicValue,
    callback: CharacteristicSetCallback,
  ) {
    this.log.debug('Triggered SET Active:', value);
    this.activeStatus = value as number;
    callback(null);
  }

  /**
   * Handle requests to get the current value of the "Current Air Purifier State" characteristic
   */
  handleCurrentAirPurifierStateGet(callback) {
    this.log.debug('Triggered GET CurrentAirPurifierState');
    callback(null, this.activeStatus);
  }

  /**
   * Handle requests to get the current value of the "Target Air Purifier State" characteristic
   */
  handleTargetAirPurifierStateGet(callback) {
    this.log.debug('Triggered GET TargetAirPurifierState');

    // set this to a valid value for TargetAirPurifierState
    const currentValue = 1;

    callback(null, currentValue);
  }

  /**
   * Handle requests to set the "Target Air Purifier State" characteristic
   */
  handleTargetAirPurifierStateSet(value, callback) {
    this.log.debug('Triggered SET TargetAirPurifierState:', value);

    callback(null);
  }
}
