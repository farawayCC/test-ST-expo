import React, { useState } from 'react'
import { Alert, View } from 'react-native'
import { RNCamera } from 'react-native-camera' // react-native-camera -> expo-camera
import { Text, Button } from 'react-native-elements';
import ImageCropPicker from 'react-native-image-crop-picker';

import MlKitOCR from 'react-native-mlkit-ocr' // react-native-mlkit-ocr -> https://github.com/barthap/expo-ocr (?)
import LoadingScreen from '../LoadingScreen';
import EVN from '../EVN';
import { showTextModal } from '../../components/UI/ModalService';


/**
 * @param {Object} props {navigation, route} where route.params = {backToScreenName: string}
 */
const CodeReaderScreen = ({ navigation, route }) => {
    let camera
    const [loading, setLoading] = useState(false)
    const [flashOn, setFlashOn] = useState(false)

    let backToScreenName = "PleaseProvideBackToScreenName"
    if (route.params && route.params.backToScreenName) {
        backToScreenName = route.params.backToScreenName
    }

    const takePictureAndAnalyze = async () => {
        if (!camera) return
        let image = await camera.takePictureAsync({ quality: 1 })
        setLoading(true)

        let evn
        try {
            evn = await runBetterOCR(image.uri)
        } catch (e) {
            setLoading(false)
            console.log('Error in CodeReaderScreen.js:takePictureAndAnalyze:runBetterOCR', e)
            if (e.message.includes("No Numbers")) {
                showTextModal({
                    title: 'Keine Nummern',
                    text: 'Es konnten leider keine Nummern auf dem Bild gefunden werden.',
                })
                return
            }
            if (e.message.includes("No Text")) {
                showTextModal({
                    title: 'Keine Text',
                    text: 'Es konnte leider kein Text auf dem Bild erkannt werden.'
                })
                return
            }
            showTextModal({
                title: 'Fehler',
                text: 'Es ist ein unbekannter Fehler bei der Erkennung aufgetreten. Das tut uns sehr Leid. Bitte benutze vorerst eine andere Eingabemethode',
            })
            return
        }

        // Run OCR on cropped Image, if needed
        if (!evn) {
            let croppedImage
            try {
                croppedImage = await ImageCropPicker.openCropper({
                    path: image.uri,
                    cropperToolbarTitle: "Bitte beschneide das Bild so, dass nur die EVN zu sehen ist.",
                    freeStyleCropEnabled: true
                })
                evn = await runBetterOCR(croppedImage.path)
            } catch (error) {
                setLoading(false)
                console.log('Error in CodeReaderScreen.js:takePictureAndAnalyze:ImageCropPicker', error)
            }
        }

        // If still got no EVN, just show a warning
        if (!evn) {
            showTextModal({
                title: 'Keine EVN erkannt',
                text: 'Achte bitte darauf, dass die EVN gut lesbar und vollständig im Bild ist.',
            })
            setLoading(false)
            return
        }

        // If found, ask user if it is correct
        showTextModal({
            title: 'EVN erkannt',
            text: `Ist dies die korrekte EVN: ${EVN.formatEVN(evn)} ?`,
            buttons: [{
                label: "Ja",
                onPress: () => submitEVN(evn)
            },
            {
                label: "Nein, ich möchte es nochmal versuchen.",
                onPress: () => setLoading(false)
            }]
        })
    }

    /*
    -- NEW OCR Extraction Method --
    Basically way faster then before
    Now uses regex to better detect EVN    
    */
    const runBetterOCR = async (imagePath) => {
        const evnRegex = /\d{11}-\d/g

        // Extract Text from Image, if no text -> quit
        const processed = await MlKitOCR.detectFromUri(imagePath)
        if (processed.length < 1) throw new Error("No Text on Picture")

        const fragments = [] // contains objects: { position: <x+y>, text: <text> }

        for (const item of processed) {

            // 1. Method: Try to analyze each block on its own
            // If regex matches, check validity of evn
            const matches = item.text.match(evnRegex)
            if (matches) {
                for (const match of matches) {
                    const cleanMatch = match.match(/\d/g).join('')
                    if (EVN.isValid(cleanMatch)) return cleanMatch
                }
            }

            // If this analysis fails:
            // Prepare Fragment for later analysis
            fragments.push({
                position: item.bounding.left * 10 + item.bounding.top,
                text: item.text
            })
        }

        // 2. Method: Join All Fragments together and try to find EVN then
        // First sort the array by its position: left to right & top to bottom
        // Filter String for only digits and dash and spaces
        // Then analyze via Regex as before

        fragments.sort((a, b) => a - b)
        const ocrText = fragments.reduce((prev, current) => `${prev}${current.text}`, '')
        const filteredText = (ocrText.match(/[\d]+(-\d)?/g) ?? []).join('')

        if (!filteredText) throw new Error("No Numbers on Picture")

        const matches = filteredText.match(evnRegex)
        if (matches) {
            for (const match of matches) {
                const cleanMatch = match.match(/[\d]/g).join('')
                if (EVN.isValid(cleanMatch)) return cleanMatch
            }
        }
        // Return null, if nothing was found
        return null
    }

    const barcodeRecognized = ({ data }) => {
        setLoading(true)

        let dataString = String(data).replace(String.fromCharCode(29), "")
        let identifier = dataString.substring(0, 4)
        let evn = ""

        if (identifier === "8004") {
            evn = getEVNFromGIAI(dataString)

        } else if (dataString.length === 12 && EVN.isValid(dataString)) {
            evn = dataString

        } else if (identifier === "http") {
            console.warn("This is a link, which is currently not supported!")
            return
        }

        if (!EVN.isValid(evn)) return

        submitEVN(evn)
    }

    const submitEVN = evn => navigation.navigate(backToScreenName, { evn })

    if (loading) return (
        <LoadingScreen message="Bitte warten, die EVN wird gerade erkannt...." />
    )

    const styles = {
        button: {
            margin: 10
        },
        rnCamera: {
            flex: 1,
            width: '100%',
            justifyContent: "space-between",
        },
        topText: {
            padding: 25,
            width: "100%",
            textAlign: "center",
            backgroundColor: "rgba(240,240,240,0.8)"
        },
        buttonsGroup: {
            display: "flex",
            flexDirection: "row",
            justifyContent: "center"
        },
    }
    return (<>
        <RNCamera
            ref={ref => { camera = ref }}
            style={styles.rnCamera}
            onBarCodeRead={barcodeRecognized}
            flashMode={flashOn ? RNCamera.Constants.FlashMode.torch : RNCamera.Constants.FlashMode.off}
            captureAudio={false}
        >
            <Text
                category="h6"
                style={styles.topText}
            >Halte den QR/Datamatrix-Code gut sichtbar im Bild, bis dieser erkannt wird. {"\n"} Um eine EVN zu erkennen, tippe bitte auf OCR</Text>
            <View
                style={styles.buttonsGroup}
            >
                <Button
                    style={styles.button}
                    onPress={() => { console.log('Leaving EVN selection screen from onPress'); navigation.navigate(backToScreenName); }}
                    icon="close-outline"
                />
                <Button
                    title={"OCR"}
                    style={styles.button}
                    icon="search-outline" iconPosition="left"
                    status="success"
                    onPress={takePictureAndAnalyze}
                >OCR</Button>
                <Button
                    style={styles.button}
                    icon="bulb" iconPosition="left"
                    status={flashOn ? "warning" : "basic"}
                    onPress={() => setFlashOn(!flashOn)}
                />
            </View>
        </RNCamera>
    </>)
}

function getEVNFromGIAI(giai) {
    return giai.substring(12)
}

export default CodeReaderScreen