export const isEmail = (value: string) => /.+@.+/.test(value);
export const isRequired = (value: string) => value.trim().length > 0;
