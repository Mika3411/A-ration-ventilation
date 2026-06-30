export const emptyAdminMemberForm = {
  firstName: "",
  lastName: "",
  company: "",
  phone: "",
  email: "",
};

export function getAdminMemberForm(member) {
  if (!member) return emptyAdminMemberForm;

  return {
    firstName: member.firstName || "",
    lastName: member.lastName || "",
    company: member.company || "",
    phone: member.phone || "",
    email: member.email || "",
  };
}

export function getAdminMemberPayload(form) {
  return {
    firstName: form.firstName,
    lastName: form.lastName,
    company: form.company,
    phone: form.phone,
    email: form.email,
  };
}
