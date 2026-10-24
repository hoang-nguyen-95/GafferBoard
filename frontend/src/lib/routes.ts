// Địa chỉ các trang. Bản web tĩnh không biết trước id nào tồn tại nên id đi qua query (?id=) thay vì đoạn đường dẫn.
export const teamHref = (id: number | string) => `/team?id=${id}`;
export const analysisHref = (id: number | string) => `/analysis?id=${id}`;
export const playerHref = (id: number | string) => `/player?id=${id}`;
export const manualHref = (id: number | string) => `/manual/view?id=${id}`;
export const manualEditHref = (id: number | string) => `/manual/edit?id=${id}`;
