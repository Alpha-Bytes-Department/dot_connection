import { TSetting } from "./setting.interface";
import { Setting } from "./setting.model";

const createOrUpdateSetting = async (field: keyof TSetting, data: string): Promise<Partial<TSetting>> => {
    const setting = await Setting.findOneAndUpdate(
        {},
        { [field]: data },
        { upsert: true, new: true }
    );
    return setting;
};

const createAboutUs = async (data: string): Promise<Partial<TSetting>> => {
    return createOrUpdateSetting('aboutUs', data);
};

const createPrivacyPolicy = async (data: string): Promise<Partial<TSetting>> => {
    return createOrUpdateSetting('privacyPolicy', data);
};

const createTermsAndConditions = async (data: string): Promise<Partial<TSetting>> => {
    return createOrUpdateSetting('termsAndConditions', data);
};

const getSettings = async (): Promise<TSetting | null> => {
    return Setting.findOne().lean();
};

export const settingService = {
    createAboutUs,
    createPrivacyPolicy,
    createTermsAndConditions,
    getSettings,
};
