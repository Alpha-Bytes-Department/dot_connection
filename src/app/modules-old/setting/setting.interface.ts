import { Document, Model } from "mongoose";

export type TSetting = {
  aboutUs?: string;
  privacyPolicy?: string;
  termsAndConditions?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export interface SettingModel extends Model<TSetting> {
  getSettings(): Promise<TSetting | null>;
  updateSetting(field: keyof TSetting, value: any): Promise<TSetting>;
}

export interface TSettingDocument extends Document, TSetting {}

export namespace TReturnSetting {
  export type GetSettings = TSetting;
  export type UpdateAboutUs = Partial<TSetting>;
  export type UpdatePrivacyPolicy = Partial<TSetting>;
  export type UpdateTermsAndConditions = Partial<TSetting>;
}
