import { useCallback } from "react";
// import { useSelector, useDispatch } from "react-redux";
// import { RootState } from "../redux/store";
// import { setInteractionId } from "../redux/reducer";
import apiClient from "./api.ts";

interface AddInteractionArguments {
  type: string;
  context: Record<string, unknown>;
  pdfId?: string;
  pdfMaterialType?: string;
  pdfPage?: number;
}

export const useSaveInteraction = () => {
  // const interactionId = useSelector((state: RootState) => state.interactionId);
  // const dispatch = useDispatch();

  /** Saves one interaction; resolves to whether the server stored it (errors are logged, never thrown). */
  const saveInteraction = useCallback(async (args: AddInteractionArguments): Promise<boolean> => {
    const action = {
      type: args.type,
      context: args.context,
      pdfId: args.pdfId ?? undefined,
      pdfMaterialType: args.pdfMaterialType ?? undefined,
      pdfPage: args.pdfPage ?? undefined,
    };

    try {
      // if (interactionId) {
      //   await apiClient.interactionControllerAddInteractionAction({
      //     addInteractionActionRequest: {
      //       interactionId: interactionId,
      //       action: action,
      //     },
      //   });
      //   console.log("Interaction saved successfully");
      // } else {
      //   const res = await apiClient.interactionControllerAddInteraction({
      //     addInteractionRequest: {
      //       action: action,
      //     },
      //   });
      //   console.log("res", res);
      //   if (res.interactionId) {
      //     dispatch(setInteractionId(res.interactionId));
      //     console.log("Interaction saved successfully");
      //   } else {
      //     console.log("Interaction saved failed");
      //   }
      // }
      await apiClient.interactionControllerAddInteraction({
        addInteractionRequest: {
          action: action,
        },
      });
      return true;
    } catch (error) {
      console.error("Error saving interaction:", error);
      return false;
    }
  }, []);

  return { saveInteraction };
};
