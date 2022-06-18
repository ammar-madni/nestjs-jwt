import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { GetCurrentUser, Public } from 'src/common/decorators';
import { RefreshTokenGuard } from 'src/common/guards';
import { AuthService } from './auth.service';
import { AuthDto, NewUserDto } from './dto';
import { Tokens } from './types';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() newUser: NewUserDto): Promise<Tokens> {
    return this.authService.register(newUser);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() userCredentials: AuthDto): Promise<Tokens> {
    return this.authService.login(userCredentials);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@GetCurrentUser() userId: number) {
    return this.authService.logout(userId);
  }

  @UseGuards(RefreshTokenGuard)
  @Post('refesh-tokens')
  @HttpCode(HttpStatus.OK)
  refresh(
    @GetCurrentUser() userId: number,
    @GetCurrentUser('refreshToken') refreshToken: string,
  ): Promise<Tokens> {
    return this.authService.refreshTokens(userId, refreshToken);
  }
}
