import express from 'express';
import Twilio from 'twilio';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  console.log("Request:::", req.url, req.body)
  next()
})

// Twilio Client
const client = Twilio(
  process.env.TWILIO_ACCOUNT_SID as string,
  process.env.TWILIO_AUTH_TOKEN as string
);

// Ensure required environment variables are set
const requiredEnvVars = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_API_KEY',
  'TWILIO_API_SECRET',
  'TWILIO_APP_SID',
  'TWILIO_CALLER_ID',
  'APP_BASE_URL'
];

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.error(`Error: Missing environment variable: ${envVar}`);
    process.exit(1);
  }
});

// Route to get Twilio access token
app.get('/GetAccessToken', (req, res) => {
  try {
    const AccessToken = Twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    const { TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, TWILIO_APP_SID } = process.env;
    const identity = req.query.userId as string || 'unknown_user';

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: TWILIO_APP_SID,
      incomingAllow: true,
    });

    const token = new AccessToken(
      TWILIO_ACCOUNT_SID as string,
      TWILIO_API_KEY as string,
      TWILIO_API_SECRET as string,
      { identity }
    );
    token.addGrant(voiceGrant);

    res.json({ token: token.toJwt(), identity });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).send('Error generating token');
  }
});

// Route to generate TwiML for outgoing call
app.post('/twiml-app', (req, res) => {
  const { To } = req.body;
  const twiml = new Twilio.twiml.VoiceResponse();

  const dial = twiml.dial({
    // record: 'record-from-answer-dual',
    callerId: process.env.TWILIO_CALLER_ID,
    answerOnBridge: true,
    action: `${process.env.APP_BASE_URL}/action`, // Redirect if unanswered
  });

  dial.number({
    statusCallbackEvent: ['answered', 'completed', 'initiated', 'ringing'],
    statusCallbackMethod: 'POST',
    statusCallback: `${process.env.APP_BASE_URL}/status`,
    machineDetection: 'DetectMessageEnd',
    amdStatusCallback: `${process.env.APP_BASE_URL}/amd-webhook`,
    amdStatusCallbackMethod: 'POST',
  }, To);

  res.type('text/xml');
  res.send(twiml.toString());
});

// Route for voicemail handling
app.post('/amd-webhook', async (req, res) => {
  const { AnsweredBy, CallSid } = req.body;

  const twiml = new Twilio.twiml.VoiceResponse();

  switch (AnsweredBy) {
    case 'machine_start':
    case 'machine_end_beep':
    case 'machine_end_silence':
    case 'machine_end_other':
      // Machine detected - Leave a voicemail
      twiml.say("Hello, this is an important message for you. Please call us back at your earliest convenience.");
      // twiml.pause({ length: 1 });
      twiml.hangup();

      // Update the call with TwiML instructions
      try {
        await client.calls(CallSid).update({ twiml: twiml.toString() });
      } catch (error) {
        console.error('Error updating call with voicemail:', error);
      }

      break;

    case 'human':
      // Human answered - Proceed to agent
      console.log('Human answered the call, proceeding with agent connection.');
      break;

    default:
      console.log('Unknown AnsweredBy status:', AnsweredBy);
      break;
  }

  res.send('ok');
});

// Handle call status
app.post('/status', async (req, res) => {
  res.send('ok');
});

// Route for post-call action (e.g., no answer)
app.post('/action', async (req, res) => {
  const twiml = new Twilio.twiml.VoiceResponse();

  const { DialCallStatus, CallStatus, To } = req.body;

  if (DialCallStatus === 'no-answer' && CallStatus == 'in-progress') {
    try {
      await client.messages.create({
        body: 'Hello, we missed your call! Please call us back.',
        to: To,
        from: process.env.TWILIO_CALLER_ID,
      });
      console.log(`SMS sent to ${To} due to no answer.`);
    } catch (error) {
      console.error('Error sending SMS:', error);
    }
  }


  res.type('text/xml');
  res.send(twiml.toString());
});


app.post('/fetch-call', async (req, res) => {
  const { callSid } = req.body;

  // Validate input
  if (!callSid) {
    return res.status(400).json({
      success: false,
      error: 'Call SID is required'
    });
  }

  try {
    const call = await client.calls.list({ parentCallSid: callSid, limit: 1, });
    return res.json({
      call: call[0]
    });

  } catch (error) {
    console.error('Error fetching call:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch call details'
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
