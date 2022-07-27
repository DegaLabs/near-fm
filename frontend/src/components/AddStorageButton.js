import React from 'react';
import { NearConfig } from "../config";
import swal from 'sweetalert';
function AddStorageButton(props) {
  async function requestStorageBalance(e) {
    e.preventDefault();
    if (window.nearFiWallet) {
      let ret = await window.nearFiWallet.signAndSendTransaction({
        receiverId: NearConfig.contractName,
        actions: [
          {methodName: "storage_deposit", args: {}, gas: "30000000000000", deposit: "100000000000000000000000"}
        ]
      })
      if (!ret.error) {
        swal("Sweet!")
      } else {
        swal("Oops", "Something went wrong", "error")
      }
    } else {
      await props._near.contract.storage_deposit({}, "30000000000000", "100000000000000000000000");
    }
  }

  return !props.enoughStorageBalance && (
    <button
      className="btn btn-primary me-md-2"
      onClick={requestStorageBalance}
    >
      Add storage balance
    </button>
  );
}

export default AddStorageButton;
