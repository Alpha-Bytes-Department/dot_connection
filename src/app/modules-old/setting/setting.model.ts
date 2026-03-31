import { model, Schema } from "mongoose";
import { TSetting, SettingModel } from "./setting.interface";

const settingSchema = new Schema<TSetting, SettingModel>({
  aboutUs: { 
    type: String, 
    default: null,
    trim: true 
  },
  privacyPolicy: { 
    type: String, 
    default: null,
    trim: true 
  },
  termsAndConditions: { 
    type: String, 
    default: null,
    trim: true 
  },
}, {
  timestamps: true,
  versionKey: false,
});

// Static methods
settingSchema.statics.getSettings = async function (): Promise<TSetting | null> {
  return await this.findOne().lean();
};

settingSchema.statics.updateSetting = async function (
  field: keyof TSetting, 
  value: any
): Promise<TSetting> {
  return await this.findOneAndUpdate(
    {},
    { [field]: value },
    { upsert: true, new: true }
  );
};

export const Setting = model<TSetting, SettingModel>("Setting", settingSchema);
