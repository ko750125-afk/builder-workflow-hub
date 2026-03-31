Write-Host "Cleaning and Updating Vercel Environment Variables..."

npx vercel env rm NEXT_PUBLIC_FIREBASE_API_KEY -y
echo "AIzaSyDut8Jwv5uQ2mbevESZXwh8CeyGO6jJaHg" | npx vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production preview development

npx vercel env rm NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN -y
echo "builder-hub-741c4.firebaseapp.com" | npx vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production preview development

npx vercel env rm NEXT_PUBLIC_FIREBASE_PROJECT_ID -y
echo "builder-hub-741c4" | npx vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production preview development

npx vercel env rm NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET -y
echo "builder-hub-741c4.firebasestorage.app" | npx vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production preview development

npx vercel env rm NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID -y
echo "339149352431" | npx vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production preview development

npx vercel env rm NEXT_PUBLIC_FIREBASE_APP_ID -y
echo "1:339149352431:web:f51bc52a6e9e3a5f69da1a" | npx vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production preview development

npx vercel env rm NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID -y
echo "G-ZGBB06NQF2" | npx vercel env add NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID production preview development

Write-Host "Envs updated. Starting Production Deployment..."
npx vercel --prod --yes
