import "~base.css"

import cssText from "data-text:~style.css"
import {
  ClipboardCopy,
  Eraser,
  Expand,
  Github,
  Shrink,
  Twitter
} from "lucide-react"
import { marked } from "marked"
import type { PlasmoCSConfig } from "plasmo"
import { useEffect, useState } from "react"

import { sendToBackground } from "@plasmohq/messaging"
import { useMessage } from "@plasmohq/messaging/hook"
import { useStorage } from "@plasmohq/storage/hook"

import { SelectComponent } from "~components/select"
import { PromptTypeEnum } from "~lib/enums"
import { storage } from "~lib/storage"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: true
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

const Index = () => {
  const [selectedPrompt, setSelectedPrompt] = useState<string>("")
  const [context, setContext] = useState<string>("")
  const [prompt, setPrompt] = useState<string>("")
  const [responseMessage, setResponseMessage] = useState<string>("")
  const [notionSpaceId] = useStorage<string>({
    key: "noiton-space-id",
    instance: storage
  })
  const [chatGPTAPIKey] = useStorage<string>({
    key: "chat-gpt-api-key",
    instance: storage
  })
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isShowElement, setIsShowElement] = useState(false)
  const [notification, setNotification] = useState<string>("")
  const [isFullMode, setIsFullMode] = useState<boolean>(false)

  // hidden panel using ESC
  useEffect(() => {
    function handleEscape(event: any) {
      if (event.key === "Escape") {
        setIsShowElement(false)
      }
    }

    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("keydown", handleEscape)
    }
  }, [])

  useEffect(() => {
    if (notification != "") {
      const timer = setTimeout(() => {
        setNotification("")
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  // show panel using shortcut
  useMessage<string, string>(async (req, res) => {
    if (req.name === "activate") {
      // if not select text, then get context from Webpage
      if (!isShowElement && window.getSelection().toString() !== "") {
        const selection = window.getSelection().toString()
        setContext(selection)
      }
      setIsShowElement(!isShowElement)
    }
  })

  // show input for ChatGPT and hel me write

  const handleLoading = () => {
    if (isLoading) {
      return (
        <progress
          className={`progress ${isFullMode ? "w-full" : "w-56"}`}></progress>
      )
    }
    const html = marked(responseMessage)
    return (
      <article
        className={`${isFullMode ? "prose-base" : "prose-xs"} `}
        dangerouslySetInnerHTML={{ __html: html }}></article>
    )
  }
  const handleMessage = async () => {
    setIsLoading(true)

    let lprompt: string = ""
    let language: string = ""
    let tone: string = ""

    const prompts = selectedPrompt.split("-")
    let promptType = prompts[0]
    if (promptType === PromptTypeEnum.Translate) {
      language = prompts[1]
    } else if (promptType === PromptTypeEnum.ChangeTone) {
      tone = prompts[1]
    } else if (promptType === PromptTypeEnum.TopicWriting) {
      setPrompt(prompts[1])
      lprompt = prompts[1]
    } else if (
      promptType === PromptTypeEnum.HelpMeWrite ||
      promptType === PromptTypeEnum.ChatGPTAPI ||
      promptType === PromptTypeEnum.ChatGPTWeb
    ) {
      lprompt = prompt
    }

    setResponseMessage("Waitting for AI response ...")

    const body = {
      promptType: promptType,
      context: context,
      prompt: lprompt,
      language: language,
      tone: tone,
      notionSpaceId: notionSpaceId,
      chatGPTAPIKey: chatGPTAPIKey
    }

    const response = await sendToBackground({
      name: "request",
      body: body
    })
    // console.log(
    //   `request: ${JSON.stringify(body)}, response: ${response.message}`
    // )
    setResponseMessage(response.message)
    setIsLoading(false)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(responseMessage)
    handleToast("Copied to clipboard")
  }

  const handleToast = (message: string) => {
    setNotification(message)
  }

  const handleClear = () => {
    setResponseMessage("")
    handleToast("Cleared")
  }

  const renderFullMode = () => {
    const mode = () => {
      if (isFullMode) {
        return <Shrink />
      } else {
        return <Expand />
      }
    }

    return (
      <button
        className="btn bg-transparent border-0"
        onClick={() => setIsFullMode(!isFullMode)}>
        {mode()}
      </button>
    )
  }

  const page = () => {
    if (isShowElement) {
      return (
        <div
          id="notionai-plus"
          className={`fixed right-10 ${
            isFullMode ? "h-5/6 w-11/12 top-10" : "h-1/2 w-1/3 top-1/3 "
          } min-w-64 overflow-hidden rounded-lg flex flex-col bg-base-300 dark:bg-slate-500`}>
          <div className="form-control flex flex-col">
            <div className="flex flex-row justify-between">
              <label className="label">
                <span className="label-text"></span>
              </label>
              <div className="flex flex-row items-center justify-end mr-2">
                <a
                  href="https://twitter.com/LiuVaayne"
                  target="_blank"
                  className="px-2">
                  <Twitter />
                </a>
                <a
                  href="https://github.com/Vaayne/NotionAI"
                  target="_blank"
                  className="bg-accent-transparent">
                  <Github />
                </a>
                {renderFullMode()}
              </div>
            </div>

            <textarea
              className={`textarea mx-1 break-all ${
                isFullMode ? "text-sm" : "text-xs"
              }  rounded-lg dark:bg-info-content dark:text-white`}
              placeholder="Please enter your context"
              value={context}
              onChange={(e) => setContext(e.target.value)}></textarea>
          </div>
          <div className="flex flex-row items-center">
            <SelectComponent
              isFullMode={isFullMode}
              selectedPrompt={selectedPrompt}
              setSelectedPrompt={setSelectedPrompt}
              prompt={prompt}
              setPrompt={setPrompt}
            />

            <button
              className={`${
                isFullMode ? "btn-sm" : "btn-xs"
              } btn-base-300 ml-0 m-2 rounded-lg dark:bg-info-content dark:text-white`}
              onClick={handleMessage}>
              Submit
            </button>
          </div>
          <div className="divider m-0"></div>
          <div className="p-0 m-0 flex flex-row justify-between content-center items-stretch">
            <p
              className={`px-4 my-1 self-center ${
                isFullMode ? "text-sm" : "text-xs"
              } text-black dark:text-white`}>
              <strong>AI Says:</strong>
            </p>
            <div className="flex flex-row">
              <button
                className={`${
                  isFullMode ? "btn-sm" : "btn-xs"
                } btn-primary bg-transparent border-0 gap-2`}
                onClick={handleClear}>
                <Eraser />
              </button>
              <button
                className={`${
                  isFullMode ? "btn-sm" : "btn-xs"
                } btn-primary bg-transparent border-0 gap-2`}
                onClick={handleCopy}>
                <ClipboardCopy />
              </button>
            </div>
          </div>
          <div className="divider m-0"></div>
          <div className="px-4 overflow-auto box-border ">
            {handleLoading()}
          </div>
        </div>
      )
    }
  }

  return (
    <div>
      {isShowElement && page()}{" "}
      {notification && (
        <div className="toast toast-top toast-end mr-4">
          <div className="alert alert-success">
            <div>
              <span>{notification}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Index
