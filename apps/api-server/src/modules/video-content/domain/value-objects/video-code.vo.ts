const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_PATTERN = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/;

export class VideoCode {
  private constructor(private readonly value: string) {}

  static create(value: string): VideoCode {
    const normalized = value.trim().toUpperCase();
    if (!CODE_PATTERN.test(normalized)) {
      throw new Error("Invalid video code format");
    }
    return new VideoCode(normalized);
  }

  static generate(): VideoCode {
    let value = "";
    for (let index = 0; index < 4; index += 1) {
      value += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    return new VideoCode(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: VideoCode): boolean {
    return this.value === other.value;
  }
}
