import AlertPortal, {type AlertProps} from "./alert";
import NoticePortal, {type NoticeProps} from "./notice";
import {eventEmit} from "@/lib/events.ts";

export function Alert(props: AlertProps) {
  eventEmit("alert", props)
  return () => {
    eventEmit("alert", {
      ...props,
      __closeIng: true
    })
  }
}

export function Notice(props: NoticeProps) {
  eventEmit("notice", props)
  return () => {
    eventEmit("notice", {
      ...props,
      __closeIng: true
    })
  }
}

export default function PromptPortal() {
  return (
    <>
      <AlertPortal/>
      <NoticePortal/>
    </>
  )
}
