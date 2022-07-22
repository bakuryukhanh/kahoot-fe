import React, { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import WaitingRoom from "../WaitingRoom/WaitingRoom"
import { useDispatch, useSelector } from "react-redux"
import { getGame } from "../../../actions/game"
import { getQuiz } from "../../../actions/quiz"
import {
  getLeaderboard,
  updateQuestionLeaderboard,
  updateCurrentLeaderboard,
} from "../../../actions/leaderboard"
import styles from "./hostScreen.module.css"
import Question from "../Question/Question"

const SCREEN = {
  waiting: "waiting",
  preview: "preview",
  question: "question",
  questionResult: "result",
  leaderboard: "leaderboard",
  endgame: 'endgame'
}

function HostScreen() {
  const socket = useSelector((state) => state.socket.socket)
  const [screen,setScreen] = useState(SCREEN.preview)
  const [isGameStarted, setIsGameStarted] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [timer, setTimer] = useState(0)
  const [playerList, setPlayerList] = useState([])
  const [questionData, setQuestionData] = useState({
    questionType: "Quiz",
    pointType: "Standard",
    answerTime: 5,
    backgroundImage: "",
    question: "",
    answerList: [
      { name: "a", body: "", isCorrect: false },
      { name: "b", body: "", isCorrect: false },
      { name: "c", body: "", isCorrect: false },
      { name: "d", body: "", isCorrect: false },
    ],
    questionIndex: 1,
  })
  const dispatch = useDispatch()
  const { id } = useParams()
  const { game } = useSelector((state) => state.games)
  const { quiz } = useSelector((state) => state.quiz)
  const { leaderboard } = useSelector((state) => state.leaderboards)
  const isLanguageEnglish = useSelector((state) => state.language.isEnglish)
  const [questionResult, setQuestionResult] = useState(
    leaderboard?.questionLeaderboard[0]
  )
  const [currentLeaderboard, setCurrentLeaderboard] = useState(
    leaderboard?.currentLeaderboard[0]
  )

  useEffect(() => {
    dispatch(getGame(id))
  }, [id, dispatch])

  useEffect(() => {
    if (game) {
      dispatch(getQuiz(game.quizId))
    }
  }, [dispatch, game])

  useEffect(() => {
    setTimer(5)
  }, [])

  const updateLeaderboard = React.useCallback(async (data, id, score) => {
    let question = await dispatch(updateQuestionLeaderboard(data, id))
    setQuestionResult(question.questionLeaderboard[data.questionIndex - 1])
    let leaderboardData = {
      questionIndex: data.questionIndex,
      playerId: data.playerId,
      playerCurrentScore: score,
    }
    let leaderboard = await dispatch(
      updateCurrentLeaderboard(leaderboardData, id)
    )
    setCurrentLeaderboard(
      leaderboard.currentLeaderboard[data.questionIndex - 1]
    )
  },[dispatch]);

  useEffect(() => {
    socket.on("get-answer-from-player", (data, id, score, player) => {
      updateLeaderboard(data, id, score)
      let playerData = { id: data.playerId, userName: player.userName }
      setPlayerList((prevstate) => [...prevstate, playerData])
    })
    socket.on("host-end-game",(data)=>{
      setScreen(SCREEN.endgame)
    })
  }, [socket, updateLeaderboard])


  const startGame = () => {
    socket.emit("start-game", quiz)
    socket.emit("question-preview", () => {
      startPreviewCountdown(5, currentQuestionIndex)
    })
    setIsGameStarted(true)
    setScreen(SCREEN.preview)
  }

  const startPreviewCountdown = (seconds, index) => {
    setScreen(SCREEN.preview)
    let time = seconds
    let interval = setInterval(() => {
      setTimer(time)
      if (time === 0) {
        clearInterval(interval)
        displayQuestion(index)
        setScreen(SCREEN.question)
      }
      time--
    }, 1000)
  }

  const startQuestionCountdown = (seconds, index) => {
    let time = seconds
    let interval = setInterval(() => {
      setTimer(time)
      if (time === 0) {
        clearInterval(interval)
        displayQuestionResult(index)
      }
      time--
    }, 1000)
  }
  const displayQuestionResult = (index) => {
    setScreen(SCREEN.questionResult)
    setCurrentQuestionIndex(currentQuestionIndex+1)
    if(index ===quiz.numberOfQuestions ){
      console.log({leaderboard: leaderboard,playerList: playerList})
      socket.emit("end-game",{leaderboard: leaderboard,playerList: playerList}, () => {
        setScreen(SCREEN.waiting)
      })
      return;
    }
    setTimeout(() => {
      displayCurrentLeaderBoard(index)
    }, 2000)
  }

  const displayCurrentLeaderBoard = (index) => {
    setScreen(SCREEN.leaderboard)
    setTimeout(() => {
      socket.emit("question-preview", () => {
        startPreviewCountdown(5, index)
        setPlayerList([])
      })
    }, 5000)

  }

  const displayQuestion = (index) => {
    if (index === quiz.questionList.length) {
      displayCurrentLeaderBoard(index)
    } else {
      setQuestionData(quiz.questionList[index])
      let time = quiz.questionList[index].answerTime
      let question = {
        answerList: quiz.questionList[index].answerList,
        questionIndex: quiz.questionList[index].questionIndex,
        correctAnswersCount: quiz.questionList[index].answerList.filter(
          (answer) => answer.isCorrect === true
        ).length,
      }
      socket.emit("start-question-timer", time, question, () => {
        startQuestionCountdown(time, index + 1)
      })
    }
  }


  return (
    <div className={styles.page}>
      {!isGameStarted && (
        <div className={styles.lobby}>
          <WaitingRoom pin={game?.pin} socket={socket} />
          <button onClick={startGame}>
            {isLanguageEnglish ? "Start a game" : "Bắt đầu"}
          </button>
        </div>
      )}

      {screen===SCREEN.preview && (
        <div className={styles["question-preview"]}>
          <h1>{timer}</h1>
        </div>
      )}
      {screen===SCREEN.question && (
        <div className={styles["question-preview"]}>
          <Question
            key={questionData.questionIndex}
            question={questionData}
            timer={timer}
            host={true}
          />
        </div>
      )}
      {screen===SCREEN.questionResult && (
        <div className={styles["question-preview"]}>
          <div className={styles["leaderboard"]}>
            <h1 className={styles["leaderboard-title"]}>
              {isLanguageEnglish ? "Question result" : "Kết quả"}
            </h1>
            <ol>
              {questionResult?.questionResultList?.map((player) => (
                <li>
                  {playerList
                    .filter((x) => x.id === player.playerId)
                    .map((x) => (
                      <mark>{x.userName}</mark>
                    ))}
                  <small>{player.playerPoints}</small>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
      {screen===SCREEN.leaderboard && (
        <div className={styles["question-preview"]}>
          <div className={styles["leaderboard"]}>
            <h1 className={styles["leaderboard-title"]}>
              {isLanguageEnglish ? "Leaderboard" : "Bảng xếp hạng"}
            </h1>
            <ol>
              {currentLeaderboard?.leaderboardList?.map((player) => (
                <li>
                  {playerList
                    .filter((x) => x.id === player.playerId)
                    .map((x) => (
                      <mark>{x.userName}</mark>
                    ))}
                  <small>{player.playerCurrentScore}</small>
                </li>
              ))}
            </ol>
          </div>
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
                  {playerList
                    .filter((x) => x.id === player.playerId)
                    .map((x) => (
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

export default HostScreen
