import { prisma } from "../../../DB/prisma";
import generateOid from "../../../util/generateOid";
import { TSetting } from "./setting.interface";

const createOrUpdateSetting = async (
  field: keyof Omit<TSetting, "id" | "createdAt" | "updatedAt">,
  data: string,
): Promise<Partial<TSetting>> => {
  const existing = await prisma.setting.findFirst();
  if (!existing) {
    return prisma.setting.create({
      data: {
        id: generateOid(),
        [field]: data,
      },
    });
  }

  return prisma.setting.update({
    where: { id: existing.id },
    data: { [field]: data },
  });
};

const createAboutUs = async (data: string) => createOrUpdateSetting("aboutUs", data);
const createPrivacyPolicy = async (data: string) =>
  createOrUpdateSetting("privacyPolicy", data);
const createTermsAndConditions = async (data: string) =>
  createOrUpdateSetting("termsAndConditions", data);
const getSettings = async () => prisma.setting.findFirst();

export const settingService = {
  createAboutUs,
  createPrivacyPolicy,
  createTermsAndConditions,
  getSettings,
};
