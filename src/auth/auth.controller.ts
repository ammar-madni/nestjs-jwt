import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { GetCurrentUser, Public } from 'src/common/decorators';
import { RefreshTokenGuard } from 'src/auth/guards';
import { CreateUserDto } from 'src/users/dto';
import { AuthService } from './auth.service';
import { AuthDto } from './dto';
import { Tokens } from './types';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() newUser: CreateUserDto): Promise<Tokens> {
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
  logout(@GetCurrentUser('refreshToken') refreshToken: string) {
    return this.authService.logout(refreshToken);
  }

  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('refresh-tokens')
  @HttpCode(HttpStatus.OK)
  refreshTokens(
    @GetCurrentUser() userId: number,
    @GetCurrentUser('refreshToken') refreshToken: string,
  ): Promise<Tokens> {
    return this.authService.refreshTokens(userId, refreshToken);
  }
}
