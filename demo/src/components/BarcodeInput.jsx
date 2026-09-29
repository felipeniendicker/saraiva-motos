import { forwardRef } from "react";
import { handleBarcodeKeyDown } from "../services/barcodeInput.js";

const BarcodeInput = forwardRef(function BarcodeInput({ value, onChange, onSubmit, disabled, ...props }, ref) {
  return (
    <input
      {...props}
      ref={ref}
      value={value}
      onChange={onChange}
      onKeyDown={(event) => handleBarcodeKeyDown(event, value, onSubmit)}
      disabled={disabled}
      autoComplete="off"
    />
  );
});

export default BarcodeInput;
