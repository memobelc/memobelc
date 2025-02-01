import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 150,
    height: 150,
},
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: "white",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  otpContainer: {
    width: '80%',
    maxWidth:300,
    height: 100,
  },
  otpBox: {
    width: 40,
    height: 50,
    borderWidth: 2,
    borderRadius: 8,
    borderColor: '#DDD',
    fontSize: 20,
    textAlign: 'center',
    color: '#333',
  },
  otpBoxFocused: {
    borderColor: '#007BFF',
  },
  button: {
    marginTop: 20,
    backgroundColor: '#007BFF',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default styles;