// modules/user/domain/value-objects/phone.vo.ts

export class Phone {
  private constructor(public readonly value: string) {}

  static create(phone: string): Phone {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Validate length (minimum 10 digits)
    if (cleaned.length < 10) {
      throw new Error('Phone number must be at least 10 digits');
    }
    
    // Validate length (maximum 15 digits)
    if (cleaned.length > 15) {
      throw new Error('Phone number must be at most 15 digits');
    }
    
    // Validate international format
    if (cleaned.startsWith('0')) {
      throw new Error('Phone number should not start with 0');
    }
    
    return new Phone(cleaned);
  }

  get countryCode(): string {
    // Extract country code (first 1-3 digits)
    const codes = ['1', '7', '20', '27', '30', '31', '32', '33', '34', '36', '39', '40', '41', '43', '44', '45', '46', '47', '48', '49', '51', '52', '53', '54', '55', '56', '57', '58', '60', '61', '62', '63', '64', '65', '66', '81', '82', '84', '86', '90', '91', '92', '93', '94', '95', '98', '211', '212', '213', '216', '218', '220', '221', '222', '223', '224', '225', '226', '227', '228', '229', '230', '231', '232', '233', '234', '235', '236', '237', '238', '239', '240', '241', '242', '243', '244', '245', '246', '248', '249', '250', '251', '252', '253', '254', '255', '256', '257', '258', '260', '261', '262', '263', '264', '265', '266', '267', '268', '269', '290', '291', '297', '298', '299', '350', '351', '352', '353', '354', '355', '356', '357', '358', '359', '370', '371', '372', '373', '374', '375', '376', '377', '378', '379', '380', '381', '382', '383', '385', '386', '387', '389', '420', '421', '423', '500', '501', '502', '503', '504', '505', '506', '507', '508', '509', '590', '591', '592', '593', '594', '595', '596', '597', '598', '599', '670', '672', '673', '674', '675', '676', '677', '678', '679', '680', '681', '682', '683', '685', '686', '687', '688', '689', '690', '691', '692', '850', '852', '853', '855', '856', '880', '886', '960', '961', '962', '963', '964', '965', '966', '967', '968', '970', '971', '972', '973', '974', '975', '976', '977', '992', '993', '994', '995', '996', '998'];
    
    let countryCode = '';
    for (const code of codes) {
      if (this.value.startsWith(code)) {
        countryCode = code;
        break;
      }
    }
    
    return countryCode || 'unknown';
  }

  get localNumber(): string {
    return this.value.slice(this.countryCode.length);
  }

  get formatted(): string {
    const cc = this.countryCode;
    const local = this.localNumber;
    
    // Format based on country code
    if (cc === '1') { // US/Canada
      return `+${cc} (${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6, 10)}`;
    }
    if (cc === '44') { // UK
      return `+${cc} ${local.slice(0, 2)} ${local.slice(2, 6)} ${local.slice(6)}`;
    }
    if (cc === '998') { // Uzbekistan
      return `+${cc} ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 7)} ${local.slice(7)}`;
    }
    
    // Default format
    return `+${cc} ${local}`;
  }

  equals(other: Phone): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}