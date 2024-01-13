// src/components/layout.tsx
import React, { ReactNode } from 'react'
import { Text, Center, Container, useColorModeValue } from '@chakra-ui/react'

type Props = {
  children: ReactNode
}

export function Layout(props: Props) {
  return (
    <div>
      
      <Container maxW="container.md" p={6}>
        {props.children}
      </Container>
      <Center as="footer" bg={useColorModeValue('gray.100', 'gray.700')} p={6}>
          <Text fontSize="md">OrangeStand - 2024</Text>
      </Center>
    </div>
  )
}