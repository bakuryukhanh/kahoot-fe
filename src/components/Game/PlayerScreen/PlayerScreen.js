import React from "react"
import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { addAnswer, getPlayerResult } from "../../../actions/playerResult"
import { useEffect } from "react"
import styles from "./playerScreen.module.css"
import Answer from "../Answer/Answer"
import diamond from "../../../assets/diamond.svg"
import triangle from "../../../assets/triangle.svg"
import circle from "../../../assets/circle.svg"
import square from "../../../assets/square.svg"
import { CircularProgress } from "@material-ui/core"

const SCREEN = {
  question: 'question',
  waiting: 'waiting',
  result: 'result',
  endgame: 'endgame',
  preview: 'preview'
}

function PlayerScreen() {
  const socket = useSelector((state) => state.socket.socket)
  const isLanguageEnglish = useSelector((state) => state.language.isEnglish)
  const dispatch = useDispatch()
  const { playerResult } = useSelector((state) => state.playerResults)
  const [result, setResult] = useState(playerResult?.answers[0])

  const [screen,setScreen] = useState(SCREEN.preview)
  const [timer, setTimer] = useState(5)
  const [answerTime, setAnswerTime] = useState(0)
  const [questionData, setQuestionData] = useState()
  const [correctAnswerCount, setCorrectAnswerCount] = useState(1)

  const [currentLeaderboard, setCurrentLeaderboard] = useState({})
  const [playerList,setPlayerList] = useState([])
  const [answer, setAnswer] = useState({
    questionIndex: 0,
    answers: [],
    time: 0,
  })


  useEffect(() => {
    socket.on("host-start-preview", () => {
      setScreen(SCREEN.preview)
      startPreviewCountdown(5)
    })
    socket.on("host-start-question-timer", (time, question) => {
      setQuestionData(question.answerList)
      startQuestionCountdown(time)
      setAnswer((prevstate) => ({
        ...prevstate,
        questionIndex: question.questionIndex,
        answers: [],
        time: 0,
      }))
      setCorrectAnswerCount(question.correctAnswersCount)
    })
    socket.on("host-end-game",({leaderboard,playerList})=>{
      setCurrentLeaderboard(leaderboard)
      setPlayerList(playerList)
      setScreen(SCREEN.endgame)
    })
  }, [socket])

  const startPreviewCountdown = (seconds) => {
    let time = seconds
    let interval = setInterval(() => {
      setTimer(time)
      if (time === 0) {
        clearInterval(interval)
        setScreen(SCREEN.question)
      }
      time--
    }, 1000)
  }

  const startQuestionCountdown = (seconds) => {
    let time = seconds
    let answerSeconds = 0
    let interval = setInterval(() => {
      setTimer(time)
      setAnswerTime(answerSeconds)
      if (time === 0) {
        clearInterval(interval)
        setScreen(SCREEN.result)
      }
      time--
      answerSeconds++
    }, 1000)
  }

  const sendAnswer = React.useCallback(async () => {
    const updatedPlayerResult = await dispatch(
      addAnswer(answer, playerResult._id)
    )
    console.log(
      updatedPlayerResult.answers[updatedPlayerResult.answers.length - 1]
    )
    setResult(
      updatedPlayerResult.answers[updatedPlayerResult.answers.length - 1]
    )
    let data = {
      questionIndex: answer.questionIndex,
      playerId: updatedPlayerResult.playerId,
      playerPoints:
        updatedPlayerResult.answers[answer.questionIndex - 1].points,
    }
    let score = updatedPlayerResult.score
    socket.emit("send-answer-to-host", data, score)
    dispatch(getPlayerResult(playerResult._id))
  },[answer, dispatch, playerResult?._id, socket])

  const checkAnswer = (name) => {
    let answerIndex = answer.answers.findIndex((obj) => obj === name)
    if (answer.answers.includes(name)) {
      //remove answer
      setAnswer((prevstate) => ({
        ...prevstate,
        answers: [
          ...prevstate.answers.slice(0, answerIndex),
          ...prevstate.answers.slice(answerIndex + 1, prevstate.answers.length),
        ],
      }))
    } else {
      //add answer
      setAnswer((prevstate) => ({
        ...prevstate,
        answers: [...prevstate.answers, name],
      }))
    }
    setAnswer((prevstate) => ({
      ...prevstate,
      time: answerTime,
    }))
  }

  useEffect(() => {
    if (
      answer?.answers.length > 0 &&
      answer?.answers.length === correctAnswerCount
    ) {
      setScreen(SCREEN.waiting)
      sendAnswer()
    } 
  }, [answer?.answers.length, correctAnswerCount, answer, socket, sendAnswer])

  return (
    <div className={styles.page}>
      {screen=== SCREEN.preview && (
        <div className={styles["question-preview"]}>
          <h1>{timer !==0 ?timer:null}</h1>
        </div>
      )}
      {screen ===SCREEN.question && (
        <div className={styles["question-preview"]}>
          <div className={styles["answers-container"]}>
            <Answer
              icon={triangle}
              showText={false}
              isAnswerClicked={answer.answers.includes("a")}
              onClick={() => checkAnswer("a")}
            />
            <Answer
              icon={diamond}
              showText={false}
              isAnswerClicked={answer.answers.includes("b")}
              onClick={() => checkAnswer("b")}
            />
            {questionData?.length > 2 && (
              <>
                <Answer
                  icon={circle}
                  showText={false}
                  isAnswerClicked={answer.answers.includes("c")}
                  onClick={() => checkAnswer("c")}
                />
                <Answer
                  icon={square}
                  showText={false}
                  isAnswerClicked={answer.answers.includes("d")}
                  onClick={() => checkAnswer("d")}
                />
              </>
            )}
          </div>
        </div>
      )}
      {screen ===SCREEN.waiting && (
        <div className={styles["question-preview"]}>
          <h1>{isLanguageEnglish ? "Wait for a result" : "Chờ kết quả"}</h1>
          <CircularProgress />
        </div>
      )}
      {screen===SCREEN.result && (
        <div
          className={styles["question-preview"]}
          style={{ backgroundColor: result?.points > 0 ? "green" : "red" }}
        >
          <h1>{isLanguageEnglish ? "Result" : "Kết quả"}</h1>
          <h3>
            {result?.points > 0
              ? isLanguageEnglish
                ? "Correct"
                : "Đúng"
              : isLanguageEnglish
              ? "Wrong"
              : "Sai"}
          </h3>
          <h3>
            {isLanguageEnglish ? "Points: " : "Điểm"} {result?.points}
          </h3>
        </div>
      )}
      {screen===SCREEN.endgame && (
        <div className={styles["question-preview"]}>
          <div className={styles["leaderboard"]}>
            <h1>
              {isLanguageEnglish ? "Game ended" : "Game kết thúc"}
            </h1>
            <h1 className={styles["leaderboard-title"]}>
              {isLanguageEnglish ? "Leaderboard" : "Bảng xếp hạng"}
            </h1>
            <ol>
              {currentLeaderboard?.leaderboardList?.map((player) => (
                <li>
                  {playerList?.map((x) => (
                      <mark>{x.userName}</mark>
                    ))}
                  <small>{player.playerCurrentScore}</small>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}

export default PlayerScreen
