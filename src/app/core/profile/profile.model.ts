export interface ProfileData {
  name: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  notes: string;
  /** Compressed WebP portrait, stored natively as a Blob in IndexedDB. */
  photo: Blob | null;
}

export const DEFAULT_PROFILE: ProfileData = {
  name: '',
  email: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  notes: '',
  photo: null,
};

/** The text-only subset that is bound to the reactive form. */
export type ProfileTextFields = Omit<ProfileData, 'photo'>;

export function profileTextFields(data: ProfileData): ProfileTextFields {
  return {
    name: data.name,
    email: data.email,
    phone: data.phone,
    addressLine1: data.addressLine1,
    addressLine2: data.addressLine2,
    city: data.city,
    state: data.state,
    postalCode: data.postalCode,
    country: data.country,
    notes: data.notes,
  };
}

/** Up-to-two-letter initials from name (fallback to email, then '?'). */
export function profileInitials(data: ProfileData): string {
  const source = data.name.trim() || data.email.trim();
  if (!source) {
    return '?';
  }
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}
