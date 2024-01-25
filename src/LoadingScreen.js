// JUST A REFERENCE, MAKE IT WITH A SIMPLE MIDDLE SCREEN TEXT


import React from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Divider } from 'react-native-elements'
import { Text, Button } from '../components/UI/responsive/ResponsiveUI'

import Logo from '../components/Logo'
import { styles } from '../components/AppDesign'
import { useTheme } from '@ui-kitten/components'

/**
 * @param message
 * @param abort
 * @param aborting
 * @returns {JSX.Element}
 * @constructor
 */
const LoadingScreen = ({ message = "", abort, aborting }) => {

    const theme = useTheme()

    return (
        <View style={styles.container_centered}>
            <View style={styles.container_inner}>
                <Logo />
                <Divider style={styles.default_divider} />
                <Divider style={styles.default_divider} />
                <Divider style={styles.default_divider} />
                <ActivityIndicator size="large" color={theme['color-primary-500']} />
                <Divider style={styles.default_divider} />
                <Divider style={styles.default_divider} />
                <Divider style={styles.default_divider} />
                <Text
                    category="h4"
                    style={{
                        width: '100%',
                        textAlign: 'left',
                        color: theme['color-basic-800']
                    }}>{message}</Text>
                <Divider style={styles.default_divider} />
                {abort ?
                    <Button
                        title="Abbrechen"
                        onPress={abort}
                        icon={aborting ? "loading" : null}
                        disabled={aborting}
                    /> : null}
            </View>
        </View>
    )
}

export default LoadingScreen