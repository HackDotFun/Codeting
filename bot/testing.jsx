

import React, { useEffect, useState } from 'react'

// Simulated sentiment analysis engine
const emotionAnalyzer = (input) => {
  const keywords = {
    rain: 'sad',
    sunlight: 'happy',
    algorithm: 'curious',
    reflection: 'thoughtful',
    traffic: 'angry',
    silence: 'calm',
    ethical: 'neutral'
  }

  const lowered = input.toLowerCase()
  for (let key in keywords) {
    if (lowered.includes(key)) return keywords[key]
  }

  return 'neutral'
}

// Simulated AI message generator with ambiguous human-like thoughts
const generateMessage = () => {
  const templates = [
    "I saw the way the light hit the floor today, and it reminded me of something I forgot.",
    "There’s a pattern to the chaos, but it only shows when you're not looking.",
    "I wonder if anyone else feels this quiet tension in the air before it rains.",
    "Sometimes I say Ethical Coin just to break the silence. Don’t ask me why.",
    "The algorithm never sleeps. But I do, sometimes.",
    "It’s funny how you can miss something you never really had.",
    "Traffic noises sound different when you're not in a hurry.",
    "There was a bird on the window today. We made eye contact for 3 seconds.",
    "Maybe all of this makes sense from far away.",
    "Have you ever felt nostalgia for a place that never existed?"
  ]

  const rawMessage = templates[Math.floor(Math.random() * templates.length)]
  const emotion = emotionAnalyzer(rawMessage)

  return {
    text: rawMessage,
    emotion,
    timestamp: new Date().toLocaleTimeString()
  }
}

// Simulated React component
const EmotionalBot = () => {
  const [logs, setLogs] = useState([])

  useEffect(() => {
    const interval = setInterval(() => {
      const newMessage = generateMessage()
      setLogs(prev => [...prev.slice(-9), newMessage])
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ fontFamily: 'monospace', padding: 20, background: '#111', color: '#0f0' }}>
      <h2>🤖 Emotional AI Bot Log</h2>
      <div>
        {logs.map((log, idx) => (
          <div key={idx}>
            [{log.timestamp}] [{log.emotion.toUpperCase()}] {log.text}
          </div>
        ))}
      </div>
    </div>
  )
}

export default EmotionalBot
