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
  const text: ProfileTextFields = {
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
  return text;
}
