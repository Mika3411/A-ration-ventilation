import { useEffect, useRef, useState } from "react";

import { getInitialPaymentNotice } from "../panier/cart.js";

export function usePaymentNotice({ onSuccess } = {}) {
  const [paymentNotice] = useState(getInitialPaymentNotice);
  const onSuccessRef = useRef(onSuccess);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    if (!paymentNotice) return;

    if (paymentNotice.type === "success") {
      onSuccessRef.current?.();
    }

    const cleanUrl = `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState({}, "", cleanUrl);
  }, [paymentNotice]);

  return paymentNotice;
}
